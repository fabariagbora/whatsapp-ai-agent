require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const {
  OPENROUTER_API_KEY,
  OPENROUTER_API_URL = "https://api.openrouter.ai/v1/chat/completions",
  PORT = 4000
} = process.env;

if (!OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY");
  process.exit(1);
}

/**
 * Proxy endpoint
 * Your Render bot calls this instead of OpenRouter directly
 */
app.post('/openrouter-proxy', async (req, res) => {
  try {
    const payload = req.body;

    // Forward request to OpenRouter
    const response = await axios.post(OPENROUTER_API_URL, payload, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    // Return OpenRouter response to bot
    res.json(response.data);

  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.send('OpenRouter proxy running'));

app.listen(PORT, () => console.log(`Proxy server listening on port ${PORT}`));
