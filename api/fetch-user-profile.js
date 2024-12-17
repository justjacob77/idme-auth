const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const jwksClient = require('jwks-rsa');

// Configure JWKS client to fetch keys from ID.me
const client = jwksClient({
  jwksUri: 'https://api.id.me/oidc/.well-known/jwks',
});

// Helper function to get the signing key based on "kid"
function getKey(header, callback) {
  console.log('JWT Header:', header); // Log the JWT header for debugging
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

  try {
    console.log('Received Authorization Code:', code);

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.id.me/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        client_id: '28bf5c72de76f94a5fb1d9454e347d4e',
        client_secret: '3e9f2e9716dba6ec74a2e42e90974828',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token Exchange Error:', errorText);
      return res.status(tokenResponse.status).json({ error: errorText });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Fetch user info JWT token
    const profileResponse = await fetch('https://api.id.me/api/public/v3/userinfo', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('UserInfo API Error:', errorText);
      return res.status(profileResponse.status).json({ error: errorText });
    }

    const jwtToken = await profileResponse.text();
    console.log('Received JWT Token:', jwtToken);

    // Log the decoded token before verification
    const decodedHeader = jwt.decode(jwtToken, { complete: true });
    console.log('Decoded JWT Header:', decodedHeader);

    // Verify the JWT token
    jwt.verify(jwtToken, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) {
        console.error('JWT Verification Error:', err.message);
        return res.status(500).json({ error: 'Failed to verify JWT token', details: err.message });
      }

      console.log('Verified and Decoded JWT:', decoded);

      res.status(200).json({
        name: `${decoded.fname || ''} ${decoded.lname || ''}`.trim(),
        email: decoded.email || 'Not Provided',
      });
    });
  } catch (error) {
    console.error('Server Error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
