const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, redirect_uri } = req.body;

  if (!code || !redirect_uri) {
    return res.status(400).json({ error: 'Missing required fields: code or redirect_uri' });
  }

  try {
    console.log('Received Authorization Code:', code);
    console.log('Redirect URI:', redirect_uri);

    // Step 1: Exchange authorization code for access token
    const tokenEndpoint = 'https://api.id.me/oauth/token';
    const tokenPayload = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirect_uri,
      client_id: '28bf5c72de76f94a5fb1d9454e347d4e', // Replace with your Client ID
      client_secret: '3e9f2e9716dba6ec74a2e42e90974828', // Replace with your Client Secret
    });

    console.log('Token Exchange Request Payload:', Object.fromEntries(tokenPayload.entries()));

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenPayload,
    });

    console.log('Token Exchange Response Status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token Exchange Error Response:', errorText);
      return res.status(tokenResponse.status).json({
        error: 'Failed to exchange token',
        details: errorText,
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('Token Exchange Success:', tokenData);

    const accessToken = tokenData.access_token;

    // Step 2: Fetch the user's profile (UserInfo endpoint)
    const profileResponse = await fetch('https://api.id.me/api/public/v3/userinfo', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('UserInfo Response Status:', profileResponse.status);

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('UserInfo API Error Response:', errorText);
      return res.status(profileResponse.status).json({
        error: 'Failed to fetch user info',
        details: errorText,
      });
    }

    const jwtToken = await profileResponse.text();
    console.log('Received JWT Token:', jwtToken);

    // Step 3: Decode the JWT to get user details
    const decoded = jwt.decode(jwtToken);

    if (!decoded) {
      console.error('JWT Decode Error: Failed to decode JWT');
      return res.status(500).json({
        error: 'Failed to decode user information',
      });
    }

    console.log('Decoded JWT:', decoded);

    // Step 4: Return user information
    res.status(200).json({
      name: `${decoded.fname || ''} ${decoded.lname || ''}`.trim(),
      email: decoded.email || 'Not Provided',
    });
  } catch (error) {
    console.error('Unexpected Server Error:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message,
    });
  }
};
