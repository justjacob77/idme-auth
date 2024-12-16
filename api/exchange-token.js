export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, redirect_uri } = req.body;

  if (!code || !redirect_uri) {
    return res.status(400).json({ error: 'Missing required fields: code or redirect_uri' });
  }

  try {
    const response = await fetch('https://api.id.me/oauth/token', {
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

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
