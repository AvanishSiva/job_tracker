const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const USER_ID = "demo-user";

exports.handler = async (event) => {
  try {
    let jobId = event.pathParameters?.jobId;
    if (!jobId) return { statusCode: 400, body: JSON.stringify({ error: "Missing jobId" }) };

    // Sanitize jobId to ensure no hidden whitespace causes mismatches
    jobId = jobId.trim();

    const body = JSON.parse(event.body || "{}");
    const now = new Date().toISOString();
    const eventId = crypto.randomUUID();

    const evt = {
      PK: `JOB#${jobId}`,
      SK: `EVT#${now}#${eventId}`,
      eventId,
      jobId,
      type: body.type || "Update",
      note: body.note || "",
      source: "manual",
      createdAt: now,
    };

    // 1. Save the event
    await ddb.send(new PutCommand({ TableName: process.env.EVENTS_TABLE, Item: evt }));

    // 2. Optional: update job stage
    // CRITICAL FIX: Use ConditionExpression to ensure we ONLY update if the job exists.
    // This prevents creating a new "ghost" job if there's an ID mismatch.
    if (body.stage) {
      try {
        await ddb.send(new UpdateCommand({
          TableName: process.env.JOBS_TABLE,
          Key: { PK: `USER#${USER_ID}`, SK: `JOB#${jobId}` },
          UpdateExpression: "SET #stage = :s, updatedAt = :u",
          ConditionExpression: "attribute_exists(PK)",
          ExpressionAttributeNames: { "#stage": "stage" },
          ExpressionAttributeValues: { ":s": body.stage, ":u": now },
        }));
      } catch (updateErr) {
        if (updateErr.name === 'ConditionalCheckFailedException') {
          console.error(`Job ${jobId} not found during stage update.`);
          // We don't fail the whole request because the event *was* saved, 
          // but we might want to alert or inconsistent state. 
          // For now, logging is sufficient as the primary bug (duplicate job) is prevented.
        } else {
          throw updateErr;
        }
      }
    }

    return { statusCode: 201, headers: { "Content-Type": "application/json" }, body: JSON.stringify(evt) };
  } catch (err) {
    console.error("Handler error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
