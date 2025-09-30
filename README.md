# whatsapp-ai-agent

A webhook server and serverless handler for integrating Evolution WhatsApp API, OpenRouter AI, Google Sheets, and a PostgreSQL lead management workflow. This project automates lead extraction, notification, and storage from WhatsApp messages using AI.

---

## Features

- **Webhook endpoint** for Evolution WhatsApp API message events
- **AI-powered lead extraction** using OpenRouter (LLM)
- **Temporary lead storage** in PostgreSQL (`temp_leads` table)
- **Google Sheets integration** for lead logging
- **Sales team notification** via WhatsApp
- **Admin endpoints** for viewing and retrying failed leads
- **Serverless handler** for Vercel deployments

---

## Architecture

1. **Evolution API** sends WhatsApp message events to `/webhook`.
2. **Webhook handler**:
   - Extracts message details.
   - Uses OpenRouter to generate a reply and extract structured lead info.
   - Stores the lead in PostgreSQL (`temp_leads`).
   - Appends the lead to Google Sheets.
   - Notifies the sales team via WhatsApp.
   - Deletes the temp lead if both sheet and notification succeed.
   - Retains temp lead for admin retry if any step fails.

---

## Folder Structure

```
.
├── api/
│   └── webhook.js           # Serverless webhook handler (Vercel)
├── evolution_config/        # Evolution API config (external)
├── evolution_instances/     # Evolution API instances (external)
├── evo-postgres-data/       # PostgreSQL data directory
├── server.js                # Main Express webhook server
├── Dockerfile               # Evolution API container (for local Evolution only)
├── docker-compose.yml       # Compose file for local Evolution + Postgres
├── package.json             # Node.js dependencies and scripts
├── README.md                # This file
├── .env                     # Environment variables (see .env.example)
├── LICENSE                  # MIT License
└── ...                      # Other config and env files
```

---

## Environment Variables

Set these in `.env` or your deployment environment:

| Variable                        | Description                                 |
|----------------------------------|---------------------------------------------|
| `EVOLUTION_BASE_URL`             | Evolution API base URL                      |
| `EVOLUTION_API_KEY`              | Evolution API key                           |
| `DATABASE_URL`                   | PostgreSQL connection string                |
| `OPENROUTER_API_KEY`             | OpenRouter API key                          |
| `OPENROUTER_API_URL`             | OpenRouter API endpoint (default provided)  |
| `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` | Google service account JSON (base64)   |
| `GOOGLE_SPREADSHEET_ID`          | Google Sheets spreadsheet ID                |
| `SALES_INSTANCE_NAME`            | Evolution instance name for notifications   |
| `SALES_WHATSAPP_NUMBER`          | WhatsApp number for sales notifications     |
| `PORT`                           | Server port (default: 3000)                 |

---

## Database Tables

Automatically created on startup:

### `bots`

| Column         | Type      | Description                |
|----------------|-----------|----------------------------|
| id             | SERIAL    | Primary key                |
| instance_name  | TEXT      | Evolution instance name    |
| model          | TEXT      | OpenRouter model           |
| context_json   | JSONB     | Business context           |
| created_at     | TIMESTAMP | Creation time              |

### `temp_leads`

| Column         | Type      | Description                |
|----------------|-----------|----------------------------|
| id             | SERIAL    | Primary key                |
| bot_id         | INTEGER   | FK to `bots`               |
| instance_name  | TEXT      | Evolution instance name    |
| name           | TEXT      | Lead name                  |
| phone          | TEXT      | Lead phone                 |
| priority       | TEXT      | Lead priority              |
| contact_method | TEXT      | Contact method             |
| notes          | TEXT      | Freeform notes             |
| raw_message    | JSONB     | Raw message data           |
| created_at     | TIMESTAMP | Creation time              |

---

## API Endpoints

### Webhook

- `POST /webhook*`
  - Handles Evolution WhatsApp message events.
  - Extracts lead, stores, appends to sheet, notifies sales.

### Admin

- `GET /admin/temp-leads`
  - Lists up to 200 recent temp leads.

- `POST /admin/retry-temp-lead/:id`
  - Retries sheet append and notification for a failed temp lead.
  - Deletes lead if both succeed.

---

## Google Sheets Integration

- Appends each lead as a row to the configured spreadsheet (`Leads!A:F`).
- Requires a Google service account JSON (base64-encoded).

---

## Sales Notification

- Sends a WhatsApp message to the configured sales number with lead details.

---

## Serverless Deployment

- Use `api/webhook.js` for Vercel or similar platforms.
- Uses persistent PostgreSQL and Google Sheets connections.

---

## Local Development

1. **Install dependencies**  
   ```sh
   npm install
   ```

2. **Start PostgreSQL and Evolution API**  
   Use `docker-compose.yml` for local services.

3. **Run the server**  
   ```sh
   node server.js
   ```

---

## Docker

- `Dockerfile` is for running the Evolution API only.
- The webhook server is a Node.js app; run separately.

---

## License

MIT License. See `LICENSE`.

---

## Author

Fabari Agbora

---

## Quick Start

1. Configure `.env` with all required variables.
2. Start PostgreSQL and Evolution API.
3. Run `node server.js` or deploy `api/webhook.js` to Vercel.
4. Point Evolution API webhook to your `/webhook` endpoint.

---

## Troubleshooting

- Check logs for missing environment variables.
- Temp leads are retained for admin retry if sheet or notification fails.
- Ensure Google Sheets and PostgreSQL are accessible from your environment.

---

## References

- `server.js`: Main Express webhook server
- `api/webhook.js`: Serverless webhook handler
- `Dockerfile`: Evolution API container
- `evo-postgres-data`: PostgreSQL data directory

---

For more details, see inline comments in `server.js` and `api/webhook.js`.