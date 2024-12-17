const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const jwksClient = require('jwks-rsa');

// Configure JWKS client to fetch keys from ID.me
const client = jwksClient({
  jwksUri: 'https://api.id.me/oidc/.well-known/jwks',
});

// Helper function to get the signing key based on "kid"
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('Failed to get signing key:', err.message);
      return callback(err, null);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

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

    // Step 1: Exchange authorization code for access token
    const tokenPayload = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirect_uri,
      client_id: 'YOUR_CLIENT_ID', // Replace with your Client ID
      client_secret: 'YOUR_CLIENT_SECRET', // Replace with your Client Secret
    });

    const tokenResponse = await fetch('https://api.id.me/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenPayload,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token Exchange Error Response:', errorText);
      return res.status(tokenResponse.status).json({
        error: 'Failed to exchange token',
        details: errorText,
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Step 2: Fetch the user's profile (UserInfo endpoint)
    const profileResponse = await fetch('https://api.id.me/api/public/v3/userinfo', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

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

    // Step 3: Verify and decode the JWT
    jwt.verify(jwtToken, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) {
        console.error('JWT Verification Error:', err.message);
        return res.status(500).json({
          error: 'Failed to verify JWT token',
          details: err.message,
        });
      }

      console.log('Decoded JWT:', decoded);

      // Step 4: Return user information
      res.status(200).json({
        name: `${decoded.fname || ''} ${decoded.lname || ''}`.trim(),
        email: decoded.email || 'Not Provided',
      });
    });
  } catch (error) {
    console.error('Unexpected Server Error:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message,
    });
  }
};
