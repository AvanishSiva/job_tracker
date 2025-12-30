const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

exports.handler = async (event) => {
  try {
    const jobId = event.pathParameters?.jobId;
    if (!jobId) return { statusCode: 400, body: JSON.stringify({ error: "Missing jobId" }) };

    const res = await ddb.send(new QueryCommand({
      TableName: process.env.EVENTS_TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": `JOB#${jobId}`, ":sk": "EVT#" },
      ScanIndexForward: false,
    }));

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(res.Items || []) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
