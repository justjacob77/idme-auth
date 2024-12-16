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
        client_id: '28bf5c72de76f94a5fb1d9454e347d4e', // Replace with your Client ID
        client_secret: '3e9f2e9716dba6ec74a2e42e90974828', // Replace with your Client Secret
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('Token Exchange Error:', error);
      return res.status(tokenResponse.status).json({ error });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Step 2: Fetch the user's profile from UserInfo endpoint
    const profileResponse = await fetch('https://api.id.me/api/public/v3/userinfo', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      const error = await profileResponse.json();
      console.error('UserInfo API Error:', error);
      return res.status(profileResponse.status).json({ error });
    }

    const jwtToken = await profileResponse.text(); // The UserInfo response is a JWT token

    // Step 3: Decode the JWT to extract user details
    const decoded = jwt.decode(jwtToken); // Decode the token without verifying the signature

    if (!decoded) {
      console.error('JWT Decode Error');
      return res.status(500).json({ error: 'Failed to decode user information' });
    }

    console.log('Decoded JWT:', decoded); // Log the decoded JWT for debugging

    // Step 4: Return user information
    res.status(200).json({
      name: `${decoded.fname || ''} ${decoded.lname || ''}`.trim(),
      email: decoded.email || 'Not Provided',
    });
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
