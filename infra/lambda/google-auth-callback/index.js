const { google } = require("googleapis");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const USER_ID = "demo-user";

exports.handler = async (event) => {
  try {
    console.log("CALLBACK HIT");
    console.log("queryStringParameters:", JSON.stringify(event.queryStringParameters));

    const code = event.queryStringParameters?.code;
    if (!code) {
      return { statusCode: 400, body: "Missing ?code in callback URL" };
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return { statusCode: 500, body: "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI" };
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return {
        statusCode: 400,
        body:
          "No refresh_token returned. Fix: Google Account -> Security -> Third-party access -> remove this app, then connect again.",
      };
    }

    await ddb.send(
      new PutCommand({
        TableName: process.env.USER_TOKENS_TABLE,
        Item: {
          PK: `USER#${USER_ID}`,
          SK: "GOOGLE",
          refreshToken: tokens.refresh_token,
          createdAt: new Date().toISOString(),
        },
      })
    );

    return { statusCode: 200, body: "✅ Gmail connected. You can close this tab." };
  } catch (err) {
    console.error("Callback error:", err);
    return { statusCode: 500, body: `Callback error: ${err.message}` };
  }
};
