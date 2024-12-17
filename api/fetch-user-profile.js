const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const jwksClient = require('jwks-rsa');

// JWKS client to fetch public keys from ID.me
const client = jwksClient({
  jwksUri: 'https://api.id.me/oidc/.well-known/jwks',
});

// Helper function to retrieve the signing key
function getKey(header, callback) {
  console.log('Decoded JWT Header:', header); // Log the JWT Header
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('Error fetching JWKS key:', err.message);
      return callback(err, null);
    }
    const signingKey = key.getPublicKey();
    console.log('Fetched Signing Key:', signingKey); // Log the signing key
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
    console.log('Redirect URI:', redirect_uri);

    // Step 1: Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.id.me/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri,
        client_id: '28bf5c72de76f94a5fb1d9454e347d4e', // Replace with your Client ID
        client_secret: '3e9f2e9716dba6ec74a2e42e90974828', // Replace with your Client Secret
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token Exchange Error:', errorText);
      return res.status(tokenResponse.status).json({
        error: 'Failed to exchange token',
        details: errorText,
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('Token Exchange Success:', tokenData);
console.log('Access Token:', tokenData.access_token);
console.log('Refresh Token:', tokenData.refresh_token);
console.log('Token Expiry (seconds):', tokenData.expires_in);
    const accessToken = tokenData.access_token;

// Step 2: Fetch the user's profile JWT token
const profileResponse = await fetch('https://api.id.me/api/public/v3/userinfo', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

if (!profileResponse.ok) {
  const errorText = await profileResponse.text();
  console.error('UserInfo API Error:', errorText);
  return res.status(profileResponse.status).json({
    error: 'Failed to fetch user info',
    details: errorText,
  });
}

// Retrieve and clean up the JWT token
let jwtToken = await profileResponse.text();
console.log('Raw JWT Token (before stripping quotes):', jwtToken);

// Remove quotes around the token
jwtToken = jwtToken.replace(/^"|"$/g, '');
console.log('JWT Token (after stripping quotes):', jwtToken);

// Decode the JWT without verification for debugging
const decodedToken = jwt.decode(jwtToken, { complete: true });
console.log('Decoded JWT Header:', decodedToken?.header);
console.log('Decoded JWT Payload:', decodedToken?.payload);

// Step 3: Verify and decode the JWT
jwt.verify(
  jwtToken,
  getKey,
  {
    algorithms: ['RS256'],
    issuer: 'https://api.id.me/oidc',
    audience: '28bf5c72de76f94a5fb1d9454e347d4e',
  },
  (err, decoded) => {
    if (err) {
      console.error('JWT Verification Error:', err.message);
      return res.status(500).json({
        error: 'Failed to verify JWT token',
        details: err.message,
      });
    }

    console.log('Verified and Decoded JWT:', decoded);

    // Return user profile data
    res.status(200).json({
      name: `${decoded.fname || ''} ${decoded.lname || ''}`.trim(),
      email: decoded.email || 'Not Provided',
    });
  }
);        // Step 4: Return user profile data
        res.status(200).json({
          name: `${decoded.fname || ''} ${decoded.lname || ''}`.trim(),
          email: decoded.email || 'Not Provided',
        });
      }
    );
  } catch (error) {
    console.error('Unexpected Server Error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      details: error.message,
    });
  }
};
