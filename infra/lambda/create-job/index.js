const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const USER_ID = "demo-user";

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();

    const item = {
      PK: `USER#${USER_ID}`,
      SK: `JOB#${jobId}`,
      jobId,
      company: body.company || "",
      role: body.role || "",
      location: body.location || "",
      appliedDate: body.appliedDate || now,
      stage: body.stage || "Applied",
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: process.env.JOBS_TABLE, Item: item }));

    return { statusCode: 201, headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) };
  } catch (err) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: err.message }) };
  }
};
