import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, redirect_uri } = req.body;

  if (!code || !redirect_uri) {
    return res.status(400).json({ error: 'Missing required fields: code or redirect_uri' });
  }

  try {
    // Step 1: Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.id.me/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        client_id: 'YOUR_CLIENT_ID',
        client_secret: 'YOUR_CLIENT_SECRET',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token Exchange Error:', errorText);
      return res.status(tokenResponse.status).json({ error: 'Failed to exchange token', details: errorText });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Step 2: Fetch the user's profile
    const profileResponse = await fetch('https://api.id.me/api/public/v3/userinfo', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('UserInfo API Error:', errorText);
      return res.status(profileResponse.status).json({ error: 'Failed to fetch user info', details: errorText });
    }

    const jwtToken = await profileResponse.text();

    // Log the raw JWT token for debugging
    console.log('Raw JWT Token:', jwtToken);

    // Step 3: Decode the JWT
    const decoded = jwt.decode(jwtToken);

    if (!decoded) {
      console.error('JWT Decode Error');
      return res.status(500).json({ error: 'Failed to decode JWT token' });
    }

    console.log('Decoded JWT:', decoded);

    // Step 4: Return user information
    res.status(200).json({
      name: `${decoded.fname || ''} ${decoded.lname || ''}`
