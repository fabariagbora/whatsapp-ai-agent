import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { OPENROUTER_API_KEY, OPENROUTER_API_URL } = process.env;

  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'Missing OPENROUTER_API_KEY' });
  }

  const url = OPENROUTER_API_URL || 'https://api.openrouter.ai/v1/chat/completions';
  const payload = req.body;

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    res.status(200).json(response.data);
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
