import axios from 'axios';
import { Pool } from 'pg';
import { google } from 'googleapis';

const {
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

// PostgreSQL setup (connection pool persists across invocations)
const pg = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Google Sheets setup
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
    console.warn('Google Sheets setup failed:', err.message);
  }
}

// Track if tables have been ensured (persists in warm container)
let tablesEnsured = false;

// Ensure tables exist
async function ensureTables() {
  if (tablesEnsured) return;
  
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
  
  tablesEnsured = true;
}

// Call OpenRouter
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
    timeout: 60000
  });
  const choices = res.data?.choices;
  if (choices && choices[0]?.message?.content) return choices[0].message.content;
  return JSON.stringify(res.data);
}

// Extract structured lead
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

// Google Sheets append
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

// Evolution send text
async function sendTextViaEvolution(instance, to, text) {
  const url = `${EVOLUTION_BASE_URL}/message/sendText/${encodeURIComponent(instance)}`;
  return axios.post(url, { number: to, text }, {
    headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
    timeout: 30000
  });
}

// Temp lead DB operations
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

// Serverless webhook handler
export default async function handler(req, res) {
  // Handle non-POST requests
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  // Ensure tables exist (only once per container lifecycle)
  try {
    await ensureTables();
  } catch (err) {
    console.error('Table creation error:', err.message);
  }

  try {
    const event = req.body;
    
    console.log('Webhook received:', event.event, 'Instance:', event.instance);
    
    // Only process message.upsert events
    if (event.event !== 'messages.upsert') {
      return res.status(200).json({ ok: true });
    }

    // Check if message exists and is not from self
    if (!event?.data?.message) {
      console.log('No message data found');
      return res.status(200).json({ ok: true });
    }
    
    if (event.data.key?.fromMe) {
      console.log('Skipping message from self');
      return res.status(200).json({ ok: true });
    }

    // Extract message details
    const text = event.data.message.conversation || event.data.message.extendedTextMessage?.text || '';
    const from = event.data.key.remoteJid;
    const instanceName = event.instance || SALES_INSTANCE_NAME || 'whatsapp-bot-2';
    
    if (!text.trim()) {
      console.log('Empty message text');
      return res.status(200).json({ ok: true });
    }

    console.log('Processing message from:', from, 'Text:', text.substring(0, 50));

    // Find or create bot
    let botRow = await pg.query('SELECT id, model, context_json FROM bots WHERE instance_name = $1 LIMIT 1', [instanceName]);
    let bot;
    if (botRow.rows.length === 0) {
      console.log('Creating new bot for instance:', instanceName);
      const insert = await pg.query(
        'INSERT INTO bots (instance_name, model, context_json) VALUES ($1,$2,$3) RETURNING *',
        [instanceName, 'x-ai/grok-4-fast:free', JSON.stringify({})]
      );
      bot = insert.rows[0];
    } else {
      bot = botRow.rows[0];
      console.log('Using existing bot:', bot.id);
    }

    const model = bot.model || 'x-ai/grok-4-fast:free';
    const businessContext = JSON.stringify(bot.context_json || {});

    // Call OpenRouter for reply
    console.log('Calling OpenRouter...');
    let replyText = "Sorry, I'm having trouble right now. We'll get back to you shortly.";
    try {
      replyText = await callOpenRouter(model, `Business context: ${businessContext}\n\nUser: ${text}\n\nReply as a helpful sales assistant.`, 0.2);
      console.log('Got reply:', replyText.substring(0, 50));
    } catch (err) {
      console.error('OpenRouter error:', err.message);
    }

    // Extract lead information
    console.log('Extracting lead data...');
    let leadObj;
    try {
      leadObj = await extractLeadStructured(model, text, businessContext);
      console.log('Lead extracted:', leadObj);
    } catch (err) {
      console.error('Lead extraction error:', err.message);
      leadObj = { name: null, phone: null, priority: 'unknown', contact_method: 'unknown', notes: '' };
    }

    // Insert temp lead
    let tempLead = null;
    try {
      tempLead = await insertTempLead(bot.id, instanceName, leadObj, event.data);
      console.log('Temp lead created:', tempLead.id);
    } catch (err) {
      console.error('Insert temp lead error:', err.message);
    }

    // Append to Google Sheet
    let sheetOk = false;
    try {
      if (sheetsClient) {
        await appendLeadToSheetRow(leadObj);
        sheetOk = true;
        console.log('Lead appended to sheet');
      }
    } catch (err) {
      console.error('Sheet append error:', err.message);
    }

    // Notify sales team
    let notifyOk = false;
    try {
      if (SALES_INSTANCE_NAME && SALES_WHATSAPP_NUMBER) {
        const summary = `New lead (bot=${instanceName}):\nName: ${leadObj.name||'—'}\nPhone: ${leadObj.phone||'—'}\nPriority: ${leadObj.priority}\nContact: ${leadObj.contact_method}\nNotes: ${leadObj.notes||'—'}`;
        await sendTextViaEvolution(SALES_INSTANCE_NAME, SALES_WHATSAPP_NUMBER, summary);
        notifyOk = true;
        console.log('Sales notification sent');
      }
    } catch (err) {
      console.error('Notify error:', err.message);
    }

    // Delete temp lead if everything succeeded
    if (tempLead && sheetOk && notifyOk) {
      try {
        await deleteTempLeadById(tempLead.id);
        console.log('Temp lead deleted');
      } catch (err) {
        console.error('Delete temp lead error:', err.message);
      }
    }

    // Reply to user
    console.log('Sending reply to user...');
    try {
      await sendTextViaEvolution(instanceName, from, replyText);
      console.log('Reply sent successfully');
    } catch (err) {
      console.error('Send reply error:', err.message);
    }

    return res.status(200).json({ ok: true, processed: true });

  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(200).json({ ok: true, error: err.message });
  }
}