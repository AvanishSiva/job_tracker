exports.handler = async () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return {
      statusCode: 500,
      body: "Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI",
    };
  }

  const scope = encodeURIComponent(
    "https://www.googleapis.com/auth/gmail.readonly"
  );

  const googleAuthUrl =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&scope=${scope}`;

  return {
    statusCode: 302,
    headers: {
      Location: googleAuthUrl,
    },
    body: "",
  };
};
