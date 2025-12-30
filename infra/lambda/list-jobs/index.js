const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const USER_ID = "demo-user";

exports.handler = async () => {
  try {
    const res = await ddb.send(new QueryCommand({
      TableName: process.env.JOBS_TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": `USER#${USER_ID}`, ":sk": "JOB#" },
    }));

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(res.Items || []) };
  } catch (err) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: err.message }) };
  }
};
