const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const USER_ID = "demo-user";

exports.handler = async (event) => {
  try {
    const jobId = event.pathParameters?.jobId;
    if (!jobId) return { statusCode: 400, body: JSON.stringify({ error: "Missing jobId" }) };

    const res = await ddb.send(new GetCommand({
      TableName: process.env.JOBS_TABLE,
      Key: { PK: `USER#${USER_ID}`, SK: `JOB#${jobId}` },
    }));

    if (!res.Item) return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(res.Item) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
