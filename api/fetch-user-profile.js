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
      return res.status(tokenResponse.status).json({ error });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Step 2: Fetch the user's profile
    const profileResponse = await fetch('https://api.id.me/api/public/v3/attributes.json', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      const error = await profileResponse.json();
      return res.status(profileResponse.status).json({ error });
    }

    const profileData = await profileResponse.json();

    // Log the full response for debugging
    console.log('Profile Data:', profileData);

    // Return the profile data
    res.status(200).json(profileData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
