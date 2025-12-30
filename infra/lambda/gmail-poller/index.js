const { google } = require("googleapis");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { QueryCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");


const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const USER_ID = "demo-user"; // MVP

const Ajv = require("ajv");
const ajv = new Ajv({ allErrors: true });

const decisionSchema = {
  type: "object",
  required: ["action", "confidence", "reason", "job", "event"],
  additionalProperties: false,
  properties: {
    action: { type: "string", enum: ["CREATE_JOB", "UPDATE_JOB", "ADD_EVENT", "IGNORE", "NEEDS_REVIEW"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reason: { type: "string" },
    job: {
      type: "object",
      required: ["match", "createIfMissing", "newJob"],
      additionalProperties: false,
      properties: {
        match: {
          type: "object",
          required: ["threadId", "jobId"],
          additionalProperties: false,
          properties: {
            threadId: { type: ["string", "null"] },
            jobId: { type: ["string", "null"] }
          }
        },
        createIfMissing: { type: "boolean" },
        newJob: {
          type: "object",
          required: ["company", "role", "source"],
          additionalProperties: false,
          properties: {
            company: { type: ["string", "null"] },
            role: { type: ["string", "null"] },
            source: { type: "string" }
          }
        }
      }
    },
    event: {
      type: "object",
      required: ["shouldCreate", "type", "summary", "stageSuggestion"],
      additionalProperties: false,
      properties: {
        shouldCreate: { type: "boolean" },
        type: { type: ["string", "null"], enum: ["ApplicationConfirmation", "AssessmentInvite", "InterviewInvite", "Rejection", "Offer", "Update", null] },
        summary: { type: ["string", "null"] },
        stageSuggestion: { type: ["string", "null"], enum: ["Applied", "Assessment", "Interview", "Offer", "Rejected", null] }
      }
    }
  }
};

const validateDecision = ajv.compile(decisionSchema);

function newId(prefix = "") {
  return prefix + crypto.randomUUID();
}

function buildQuery() {
  // Optimization: 2 day window, exclude promotions and social updates
  return `newer_than:2d -category:promotions -category:social (subject:("application" OR "interview" OR "assessment" OR "test" OR "rejected" OR "offer") OR from:(greenhouse.io OR lever.co OR workday OR icims OR smartrecruiters OR hackerrank.com OR codility.com))`;
}

function extractJson(text) {
  if (!text) throw new Error("Empty model response");

  // If Gemini wraps output in ```json ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const cleaned = fenced ? fenced[1] : text;

  const t = cleaned.trim();

  // Grab first JSON object if there's extra junk
  const obj = t.match(/\{[\s\S]*\}/);
  if (!obj) throw new Error(`No JSON found in: ${t.slice(0, 200)}`);

  return JSON.parse(obj[0]);
}

// ... imports ...

async function fetchExistingJobs(ddb) {
  try {
    const res = await ddb.send(new QueryCommand({
      TableName: process.env.JOBS_TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": `USER#${USER_ID}`, ":sk": "JOB#" },
    }));
    return (res.Items || []).map(j => ({
      id: j.jobId || j.SK.replace("JOB#", ""),
      company: j.company,
      role: j.role,
      stage: j.stage
    }));
  } catch (e) {
    console.error("Failed to fetch jobs:", e);
    return [];
  }
}

async function applyDecision(ddb, userId, email, decision) {
  const jobsTable = process.env.JOBS_TABLE;
  const eventsTable = process.env.EVENTS_TABLE;

  // KEY CHANGE: Use the matched jobId if the agent found one.
  // Otherwise, fall back to the thread-based ID.
  const matchedJobId = decision.job?.match?.jobId;

  // Logic: 
  // 1. If we have a direct match, use it.
  // 2. If no match, but "createIfMissing" is true, generate a NEW thread-based ID.
  // 3. If no match and no create, we might just skip or log (depends on logic).

  let jobSk;
  let jobPk = `USER#${userId}`;
  let finalJobId;

  if (matchedJobId) {
    // We are linking to an EXISTING job
    finalJobId = matchedJobId;
    jobSk = `JOB#${matchedJobId}`; // Valid because we use SK as main ID reference usually

    // NOTE: In the current data model, SK is JOB#{GUID}. 
    // If the matchedJobId came from our DB, it satisfies this.
  } else {
    // New job from thread
    const threadId = email.threadId;
    if (!threadId) {
      console.log(" No threadId & no match, skipping.");
      return;
    }
    finalJobId = threadId;
    jobSk = `JOB#THREAD#${threadId}`;
  }

  // 1) Create job if requested (AND it's a new job, i.e. not a match)
  // If matchedJobId is present, we assume it exists and don't re-create it unless we want to upsert fields.
  // The prompt says "createIfMissing".
  if (!matchedJobId && (decision.action === "CREATE_JOB" || decision.job?.createIfMissing)) {
    const now = new Date().toISOString();
    await ddb.send(new PutCommand({
      TableName: jobsTable,
      Item: {
        PK: jobPk,
        SK: jobSk,
        jobId: finalJobId,
        threadId: email.threadId,
        company: decision.job?.newJob?.company ?? null,
        role: decision.job?.newJob?.role ?? null,
        source: "Email",
        stage: decision.event?.stageSuggestion ?? "Applied",
        createdAt: now,
        updatedAt: now,
      },
      // only create if doesn't exist
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    })).catch((e) => {
      if (String(e?.name || "").includes("ConditionalCheckFailed")) return;
      throw e;
    });
  }

  // 2) Add event if requested
  if (decision.event?.shouldCreate) {
    const ts = new Date().toISOString();
    // Link event to the computed jobSk (either existing or new)
    const evtPk = jobSk;
    const evtSk = `EVT#${ts}#${email.messageId}`;

    await ddb.send(new PutCommand({
      TableName: eventsTable,
      Item: {
        PK: evtPk,
        SK: evtSk,
        threadId: email.threadId,
        messageId: email.messageId,
        type: decision.event.type,
        summary: decision.event.summary,
        createdAt: ts,
        from: email.from,
        subject: email.subject,
      },
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    })).catch((e) => {
      if (String(e?.name || "").includes("ConditionalCheckFailed")) return;
      throw e;
    });
  }

  // 3) Update stage if suggested (safe update)
  if (decision.event?.stageSuggestion) {
    const now = new Date().toISOString();
    await ddb.send(new UpdateCommand({
      TableName: jobsTable,
      Key: { PK: jobPk, SK: jobSk },
      UpdateExpression: "SET #stage = :s, updatedAt = :u",
      ExpressionAttributeNames: { "#stage": "stage" },
      ExpressionAttributeValues: { ":s": decision.event.stageSuggestion, ":u": now },
      // Optional: ConditionExpression: "attribute_exists(PK)" to be safe, 
      // though if we just created it above, it exists. 
      // If it's a match, it SHOULD exist.
    })).catch((e) => {
      console.log(` Stage update skipped (job missing or other error): ${e.message}`);
    });
  }
}

async function agentDecide(email, existingJobs) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY env var");

  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  // Format existing jobs for context
  const jobsListInfo = existingJobs.map(j =>
    `- Role: "${j.role}", Company: "${j.company}", ID: "${j.id}"`
  ).join("\n");

  const schemaInstruction = `
    Return ONLY valid JSON (no markdown). Structure:
    {
    "action": "CREATE_JOB" | "UPDATE_JOB" | "ADD_EVENT" | "IGNORE" | "NEEDS_REVIEW",
    "confidence": number,
    "reason": string,
    "job": {
        "match": { "threadId": string|null, "jobId": string|null },
        "createIfMissing": boolean,
        "newJob": { "company": string|null, "role": string|null, "source": "Email" }
    },
    "event": {
        "shouldCreate": boolean,
        "type": "ApplicationConfirmation"|"AssessmentInvite"|"InterviewInvite"|"Rejection"|"Offer"|"Update"|null,
        "summary": string|null,
        "stageSuggestion": "Applied"|"Assessment"|"Interview"|"Offer"|"Rejected"|null
    }
    }
  `;

  const prompt = `
    You are an AI agent managing a job tracker.
    
    EXISTING JOBS:
    ${jobsListInfo}
    --------------------------------------------------

    Incoming Email:
    from: ${email.from}
    subject: ${email.subject}
    date: ${email.date}
    snippet: ${email.snippet.slice(0, 500)}

    Task:
    1. FILTER JUNK: If this is a generic reminder from a platform (e.g., Coding Ninjas, Naukri, LinkedIn) asking to "apply now" or "complete profile", and it is NOT a direct update from a specific company, return action="IGNORE".
    2. MATCH: Check if this email relates to any EXISTING JOB (fuzzy match Company/Role). If match, set job.match.jobId. Action=UPDATE_JOB or ADD_EVENT.
    3. NEW: If it's a valid new application/interview/rejection from a company, set job.createIfMissing=true. Action=CREATE_JOB.
    
    ${schemaInstruction}
    `;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  // console.log("GEMINI RAW RESPONSE:", JSON.stringify(data));

  if (!resp.ok) {
    throw new Error(`Gemini error ${resp.status}: ${JSON.stringify(data)}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  // console.log("RAW GEMINI TEXT:", text.slice(0, 300));
  if (!text) throw new Error("No text returned by Gemini");

  return extractJson(text);
}

async function claimEmailOnce(ddb, tableName, userId, gmailMessageId) {
  const pk = `USER#${userId}`;
  const sk = `MSG#${gmailMessageId}`;

  // TTL: keep processed ids for 14 days (change if you want)
  const ttl = Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60;

  try {
    await ddb.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: pk,
          SK: sk,
          gmailMessageId,
          createdAt: new Date().toISOString(),
          ttl,
        },
        // If it already exists, this fails -> we treat as "already processed"
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      })
    );
    return true; // claimed successfully
  } catch (e) {
    return false; // already processed (or conditional check failed)
  }
}

exports.handler = async (event) => {
  console.log("✅ GmailPoller started:", new Date().toISOString());

  // 1) Load refresh token from DynamoDB
  const tokenRes = await ddb.send(
    new GetCommand({
      TableName: process.env.USER_TOKENS_TABLE,
      Key: { PK: `USER#${USER_ID}`, SK: "GOOGLE" },
    })
  );

  const refreshToken = tokenRes.Item?.refreshToken;
  if (!refreshToken) {
    console.log("⚠️ No refresh token found. Connect Gmail first.");
    return { ok: false, reason: "no_refresh_token" };
  }

  // 2) Create OAuth client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  // 3) Gmail client
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // 4) Fetch Existing Jobs for Context
  const existingJobs = await fetchExistingJobs(ddb);
  console.log(`ℹ️ Found ${existingJobs.length} existing jobs for context.`);

  // 5) Search for messages
  const q = buildQuery();
  console.log("🔎 Gmail query:", q);

  const list = await gmail.users.messages.list({
    userId: "me",
    q,
    maxResults: 2,
  });

  const messages = list.data.messages || [];
  console.log("📩 Found messages:", messages.length);

  // 6) Iterate
  for (const m of messages) {
    const claimed = await claimEmailOnce(
      ddb,
      process.env.PROCESSED_EMAILS_TABLE,
      USER_ID,
      m.id
    );

    if (!claimed) {
      console.log("⏭️ Skipping already processed:", m.id);
      continue;
    }

    const msg = await gmail.users.messages.get({
      userId: "me",
      id: m.id,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "Date"],
    });

    const headers = msg.data.payload?.headers || [];
    const subject = headers.find((h) => h.name === "Subject")?.value || "";
    const from = headers.find((h) => h.name === "From")?.value || "";
    const date = headers.find((h) => h.name === "Date")?.value || "";
    const snippet = msg.data.snippet || "";
    const threadId = msg.data.threadId || "";

    const email = {
      messageId: m.id,
      threadId,
      from,
      subject,
      date,
      snippet,
    };

    // Pass existing jobs to agent
    const decision = await agentDecide(email, existingJobs);

    if (!validateDecision(decision)) {
      console.log("❌ Invalid decision JSON:", validateDecision.errors);
      continue;
    }

    console.log("🤖 AGENT DECISION:", JSON.stringify(decision));

    if (decision.action === "IGNORE") {
      console.log("🚫 Action is IGNORE. Skipping.");
      continue;
    }

    await applyDecision(ddb, USER_ID, email, decision);

    console.log("---- PROCESSED EMAIL ----");
    console.log("Subject:", subject);
    console.log("Match:", decision.job?.match?.jobId ? `EXISTING: ${decision.job.match.jobId}` : "NEW");

    // Rate limit
    await sleep(15000);
  }

  return { ok: true, found: messages.length };
};
