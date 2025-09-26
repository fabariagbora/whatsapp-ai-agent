/**
 * server.js
 * Webhook server implementing:
 * Evolution -> /webhook -> OpenRouter -> temp lead store -> Sheets -> notify -> cleanup
 *
 * Notes:
 * - Successful append + notify => delete temp lead
 * - Failure on append or notify => keep temp lead for retry
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { Pool } = require('pg');
const { google } = require('googleapis');

const app = express();
app.use(bodyParser.json());

/* ========= Config from env ========= */
const {
  PORT = 3000,
  EVOLUTION_BASE_URL,
  EVOLUTION_API_KEY,
  DATABASE_URL,
  OPENROUTER_API_KEY,
  OPENROUTER_API_URL = "https://api.openrouter.ai/v1/chat/completions",
  GOOGLE_SERVICE_ACCOUNT_JSON_BASE64,
  GOOGLE_SPREADSHEET_ID,
  SALES_INSTANCE_NAME,
  SALES_WHATSAPP_NUMBER
} = process.env;

if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY || !DATABASE_URL || !OPENROUTER_API_KEY) {
  console.error("Missing required env vars. See .env.example");
  process.exit(1);
}

/* ======= Postgres pool ======= */
const pg = new Pool({
  connectionString: DATABASE_URL,
  ssl: (process.env.NODE_ENV === 'production') ? { rejectUnauthorized: false } : false
});

/* ======= Ensure tables (bots + temp_leads) ======= */
async function ensureTables() {
  await pg.query(`
    CREATE TABLE IF NOT EXISTS bots (
      id SERIAL PRIMARY KEY,
      instance_name TEXT UNIQUE,
      model TEXT,
      context_json JSONB,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS temp_leads (
      id SERIAL PRIMARY KEY,
      bot_id INTEGER REFERENCES bots(id),
      instance_name TEXT,
      name TEXT,
      phone TEXT,
      priority TEXT,
      contact_method TEXT,
      notes TEXT,
      raw_message JSONB,
      created_at TIMESTAMP DEFAULT now()
    );
  `);
}

/* ======= Google Sheets auth (base64 service account) ======= */
let sheetsClient = null;
if (GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 && GOOGLE_SPREADSHEET_ID) {
  try {
    const keyJson = JSON.parse(Buffer.from(GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials: keyJson,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    sheetsClient = google.sheets({ version: 'v4', auth });
  } catch (err) {
    console.warn("Invalid GOOGLE_SERVICE_ACCOUNT_JSON_BASE64:", err.message || err);
  }
}

/* ======= Helpers ======= */

async function callOpenRouter(model, prompt, temperature = 0.2) {
  const payload = {
    model: model || "x-ai/grok-4-fast:free",
    messages: [
      { role: "system", content: "You are a helpful sales assistant." },
      { role: "user", content: prompt }
    ],
    max_tokens: 512,
    temperature
  };

  const res = await axios.post(OPENROUTER_API_URL, payload, {
    headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 60_000
  });
  const choices = res.data && res.data.choices;
  if (choices && choices[0] && choices[0].message && choices[0].message.content) {
    return choices[0].message.content;
  }
  return (res.data && typeof res.data === 'string') ? res.data : JSON.stringify(res.data);
}

async function extractLeadStructured(model, message, context = "") {
  const extractionPrompt = `
You are a JSON extractor. Given a customer message and optionally business context, extract lead info into a JSON object with these fields:
{
  "name": "string or null",
  "phone": "string or null",
  "priority": "low|medium|high|unknown",
  "contact_method": "phone|text|whatsapp|unknown",
  "notes": "free text"
}
Return ONLY the JSON object. Business context: ${context}
Customer message: ${message}
`;
  const reply = await callOpenRouter(model, extractionPrompt, 0.0);
  const firstBrace = reply.indexOf('{');
  try {
    const jsonText = firstBrace >= 0 ? reply.slice(firstBrace) : reply;
    const parsed = JSON.parse(jsonText);
    return {
      name: parsed.name || null,
      phone: parsed.phone || null,
      priority: parsed.priority || 'unknown',
      contact_method: parsed.contact_method || 'unknown',
      notes: parsed.notes || ''
    };
  } catch {
    return {
      name: null,
      phone: null,
      priority: 'unknown',
      contact_method: 'unknown',
      notes: (reply || '').slice(0, 2000)
    };
  }
}

async function appendLeadToSheetRow(lead) {
  if (!sheetsClient) throw new Error("Sheets client not configured");
  const values = [
    [ new Date().toISOString(), lead.name||'', lead.phone||'', lead.priority||'', lead.contact_method||'', lead.notes||'' ]
  ];
  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SPREADSHEET_ID,
    range: 'Leads!A:F',
    valueInputOption: 'RAW',
    requestBody: { values }
  });
}

async function sendTextViaEvolution(instance, to, text) {
  const url = `${EVOLUTION_BASE_URL}/message/sendText/${encodeURIComponent(instance)}`;
  const payload = { number: to, text };
  return axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
    timeout: 30_000
  });
}

/* ======= DB operations for temp leads ======= */

async function insertTempLead(botId, instanceName, leadObj, rawMsg) {
  const q = `
    INSERT INTO temp_leads (bot_id, instance_name, name, phone, priority, contact_method, notes, raw_message)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
  const vals = [botId, instanceName, leadObj.name, leadObj.phone, leadObj.priority, leadObj.contact_method, leadObj.notes, rawMsg];
  const r = await pg.query(q, vals);
  return r.rows[0];
}

async function deleteTempLeadById(id) {
  await pg.query('DELETE FROM temp_leads WHERE id = $1', [id]);
}

/* ======= Webhook route ======= */

app.post(['/webhook', '/webhook/*'], async (req, res) => {

  res.status(200).send({ ok: true });

  try {
    const event = req.body;
    const messages = event.messages || (event.payload && event.payload.messages) || (event.body && event.body.messages);
    if (!messages) return;

    for (const msg of messages) {
      const from = msg.from || msg.author || msg.sender;
      const text = (msg.body && msg.body.text) || msg.text || msg.message || (msg.data && msg.data.text) || "";
      if (!text || text.trim().length === 0) continue;

      const instanceName = event.instance || event.instanceName || SALES_INSTANCE_NAME || 'default-instance';

      let botRow = await pg.query('SELECT id, model, context_json FROM bots WHERE instance_name = $1 LIMIT 1', [instanceName]);
      let bot;
      if (botRow.rows.length === 0) {
        const insert = await pg.query(
          'INSERT INTO bots (instance_name, model, context_json) VALUES ($1,$2,$3) RETURNING *',
          [instanceName, 'x-ai/grok-4-fast:free', JSON.stringify({})]
        );
        bot = insert.rows[0];
      } else bot = botRow.rows[0];

      const model = bot.model || 'x-ai/grok-4-fast:free';
      const contextJson = bot.context_json || {};
      const businessContext = JSON.stringify(contextJson);

      let replyText;
      try {
        replyText = await callOpenRouter(model, `Business context: ${businessContext}\n\nUser: ${text}\n\nReply as a helpful sales assistant.`, 0.2);
      } catch {
        replyText = "Sorry, I'm having trouble right now. We'll get back to you shortly.";
      }

      let leadObj;
      try {
        leadObj = await extractLeadStructured(model, text, businessContext);
      } catch {
        leadObj = { name: null, phone: null, priority: 'unknown', contact_method: 'unknown', notes: '' };
      }

      let tempLead;
      try {
        tempLead = await insertTempLead(bot.id, instanceName, leadObj, msg);
      } catch {
        tempLead = null;
      }

      let sheetOk = false;
      try {
        if (sheetsClient) {
          await appendLeadToSheetRow(leadObj);
          sheetOk = true;
        }
      } catch {}

      let notifyOk = false;
      try {
        if (SALES_INSTANCE_NAME && SALES_WHATSAPP_NUMBER) {
          const summary = `New lead (bot=${instanceName}):\nName: ${leadObj.name||'—'}\nPhone: ${leadObj.phone||'—'}\nPriority: ${leadObj.priority}\nContact: ${leadObj.contact_method}\nNotes: ${leadObj.notes||'—'}`;
          await sendTextViaEvolution(SALES_INSTANCE_NAME, SALES_WHATSAPP_NUMBER, summary);
          notifyOk = true;
        }
      } catch {}

      if (tempLead && sheetOk && notifyOk) {
        try { await deleteTempLeadById(tempLead.id); } catch {}
      }

      try { await sendTextViaEvolution(instanceName, from, replyText); } catch {}
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
  }
});

/* ======= Admin endpoints ======= */
app.get('/admin/temp-leads', async (req, res) => {
  const r = await pg.query('SELECT * FROM temp_leads ORDER BY created_at DESC LIMIT 200');
  res.json(r.rows);
});

app.post('/admin/retry-temp-lead/:id', async (req, res) => {
  const id = Number(req.params.id);
  const q = await pg.query('SELECT * FROM temp_leads WHERE id = $1 LIMIT 1', [id]);
  if (!q.rows.length) return res.status(404).json({ error: 'not found' });
  const t = q.rows[0];

  const leadObj = { name: t.name, phone: t.phone, priority: t.priority, contact_method: t.contact_method, notes: t.notes };
  let sheetOk = false, notifyOk = false;
  try { if (sheetsClient) { await appendLeadToSheetRow(leadObj); sheetOk = true; } } catch {}
  try {
    if (SALES_INSTANCE_NAME && SALES_WHATSAPP_NUMBER) {
      const summary = `New lead (bot=${t.instance_name}):\nName: ${leadObj.name||'—'}\nPhone: ${leadObj.phone||'—'}\nPriority: ${leadObj.priority}\nContact: ${leadObj.contact_method}\nNotes: ${leadObj.notes||'—'}`;
      await sendTextViaEvolution(SALES_INSTANCE_NAME, SALES_WHATSAPP_NUMBER, summary);
      notifyOk = true;
    }
  } catch {}

  if (sheetOk && notifyOk) {
    await deleteTempLeadById(id);
    return res.json({ ok: true, deleted: true });
  } else {
    return res.json({ ok: false, sheetOk, notifyOk });
  }
});

app.get('/', (req, res) => res.json({ status: 'ok', version: '1.0' }));

/* ======= Start server ======= */
(async () => {
  try {
    await ensureTables();
    await pg.query('SELECT 1');
    app.listen(PORT, () => console.log(`Webhook server listening on ${PORT}`));
  } catch (err) {
    console.error("Failed to start:", err);
    process.exit(1);
  }
})();
