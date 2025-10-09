# whatsapp-ai-agent

A complete WhatsApp AI sales assistant with webhook server, Next.js dashboard, and PostgreSQL lead management. This project automates lead extraction, notification, and storage from WhatsApp messages using AI.

---

## Features

- **🎨 Modern Frontend Dashboard** - Next.js 15 with real-time conversation monitoring
- **📱 QR-based Onboarding Flow** - 6-step setup for businesses to connect WhatsApp
- **🤖 AI-powered Lead Extraction** - Automated lead capture using OpenRouter (LLM)
- **📊 Real-time Analytics** - Monitor AI performance and conversation health
- **💾 PostgreSQL Storage** - Lead management with temporary retry storage
- **📄 Google Sheets Integration** - Automatic lead logging
- **📲 WhatsApp Notifications** - Instant alerts to sales team
- **🔄 Admin Retry Interface** - Handle failed operations gracefully
- **☁️ Serverless Ready** - Deploy webhook handler to Vercel

---

## Architecture

1. **Customer** sends WhatsApp message
2. **Evolution API** forwards event to webhook
3. **Webhook Handler** processes message:
   - Extracts message details
   - Uses AI to generate reply and extract lead data
   - Stores lead in PostgreSQL
   - Logs to Google Sheets
   - Notifies sales team via WhatsApp
   - Updates dashboard in real-time
4. **Dashboard** displays conversations and analytics instantly

---

## Folder Structure

```
whatsapp-ai-agent/
├── frontend/                    # Next.js 15 Frontend (NEW)
│   ├── app/
│   │   ├── onboarding/
│   │   │   └── page.jsx        # 6-step onboarding flow
│   │   ├── dashboard/
│   │   │   └── page.jsx        # Real-time conversation monitor
│   │   ├── api/
│   │   │   └── ...             # API routes (future)
│   │   ├── layout.jsx          # Root layout
│   │   └── page.jsx            # Landing page
│   ├── public/                 # Static assets
│   ├── package.json
│   ├── tailwind.config.js
│   └── next.config.js
│
├── api/                        # Serverless Functions
│   └── webhook.js              # Vercel webhook handler
│
├── evolution_config/           # Evolution API config (external)
├── evolution_instances/        # Evolution API instances (external)
├── evo-postgres-data/          # PostgreSQL data directory
│
├── server.js                   # Express webhook server (Node.js)
├── Dockerfile                  # Evolution API container
├── docker-compose.yml          # Local Evolution + Postgres setup
├── package.json                # Backend dependencies
├── .env                        # Environment variables
├── .env.example                # Example environment config
├── README.md                   # This file
└── LICENSE                     # MIT License
```

---

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **Vercel** - Hosting (free tier)

### Backend
- **Node.js + Express** - Webhook server
- **Evolution API** - WhatsApp connection (self-hosted or Render)
- **PostgreSQL** - Lead storage and management
- **OpenRouter** - AI response generation
- **Google Sheets API** - Lead logging

---

## Environment Variables

Create `.env` in the **root** folder:

```env
# Evolution API
EVOLUTION_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=your_api_key_here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_db

# AI
OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=your_base64_encoded_json_here
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here

# Notifications
SALES_INSTANCE_NAME=your_evolution_instance_name
SALES_WHATSAPP_NUMBER=+234XXXXXXXXXX

# Server
PORT=3001
```

Create `.env.local` in the **frontend** folder:

```env
# API Endpoints (for frontend to call backend)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Future: Supabase integration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Database Tables

### `bots`
Stores bot configuration per WhatsApp instance.

| Column         | Type      | Description                |
|----------------|-----------|----------------------------|
| id             | SERIAL    | Primary key                |
| instance_name  | TEXT      | Evolution instance name    |
| model          | TEXT      | OpenRouter model name      |
| context_json   | JSONB     | Business context/FAQs      |
| created_at     | TIMESTAMP | Creation time              |

### `temp_leads`
Temporary storage for leads with retry capability.

| Column         | Type      | Description                |
|----------------|-----------|----------------------------|
| id             | SERIAL    | Primary key                |
| bot_id         | INTEGER   | FK to `bots`               |
| instance_name  | TEXT      | Evolution instance name    |
| name           | TEXT      | Lead name                  |
| phone          | TEXT      | Lead phone                 |
| priority       | TEXT      | low/medium/high            |
| contact_method | TEXT      | Contact preference         |
| notes          | TEXT      | Additional context         |
| raw_message    | JSONB     | Original message data      |
| created_at     | TIMESTAMP | Creation time              |

---

## Getting Started

### 1. Backend Setup

```bash
# Install backend dependencies
npm install

# Start PostgreSQL (Docker)
docker-compose up -d postgres

# Run the webhook server
node server.js
```

Server runs on: `http://localhost:3001`

### 2. Frontend Setup

```bash
# Navigate to frontend folder
cd frontend

# Install frontend dependencies
npm install

# Run development server
npm run dev
```

Dashboard runs on: `http://localhost:3000`

### 3. Access the Dashboard

- **Onboarding Flow:** http://localhost:3000/onboarding
- **Dashboard Monitor:** http://localhost:3000/dashboard

---

## API Endpoints

### Webhook
- `POST /webhook` - Receives Evolution API message events

### Admin (Backend)
- `GET /admin/temp-leads` - List recent temp leads
- `POST /admin/retry-temp-lead/:id` - Retry failed operations

### Frontend API Routes (Future)
- `POST /api/onboarding` - Create new account
- `POST /api/onboarding/upload` - Upload context documents
- `POST /api/evolution/create-instance` - Generate QR code

---

## Deployment

### Backend (Render/Railway)
```bash
# Deploy webhook server
# Set environment variables in dashboard
# Connect to PostgreSQL database
```

### Frontend (Vercel)
```bash
# In frontend folder
vercel

# Or connect GitHub repo to Vercel dashboard
```

### Evolution API (Render Starter - $7/month)
- Deploy Evolution API container
- Point webhook to your backend URL
- Always-on instance ensures 24/7 availability

---

## Development Workflow

1. **Local Development:**
   - Backend: `node server.js` (port 3001)
   - Frontend: `cd frontend && npm run dev` (port 3000)
   - Database: `docker-compose up postgres`

2. **Testing Onboarding:**
   - Visit http://localhost:3000/onboarding
   - Complete all 6 steps
   - Check console for API calls

3. **Testing Dashboard:**
   - Visit http://localhost:3000/dashboard
   - Mock data loads automatically
   - Test filters, search, and conversation selection

---

## Roadmap

### ✅ Phase 1: MVP (Completed)
- [x] Webhook integration with Evolution API
- [x] AI-powered lead extraction
- [x] Google Sheets logging
- [x] WhatsApp notifications
- [x] PostgreSQL storage with retry logic
- [x] Next.js onboarding flow (6 steps)
- [x] Real-time dashboard UI

### 🚧 Phase 2: Backend Integration (Current)
- [ ] Connect frontend to backend APIs
- [ ] Implement QR code generation (Evolution API)
- [ ] Document upload and processing
- [ ] Account creation in database
- [ ] Real webhook → dashboard updates

### 📋 Phase 3: Production Ready
- [ ] Supabase migration (real-time subscriptions)
- [ ] User authentication
- [ ] Multi-tenant support
- [ ] AI performance analytics
- [ ] Human takeover capability
- [ ] Mobile responsive design

### 🚀 Phase 4: Advanced Features
- [ ] AI memory with embeddings (pgvector)
- [ ] Custom AI training per account
- [ ] Advanced sentiment analysis
- [ ] Team collaboration features
- [ ] White-label option

---

## Cost Structure

**MVP Operating Cost:**
- Evolution API (Render Starter): **$7/month**
- Database (PostgreSQL): **Free** (Supabase free tier)
- Frontend Hosting: **Free** (Vercel free tier)
- **Total: $7/month** (supports 50+ businesses)

**Scaling:**
- At 50 accounts: Upgrade Supabase Pro (+$25/month)
- At 100 accounts: Upgrade Render Standard (+$25/month)
- **Total at scale: ~$50/month for 100+ businesses**

---

## Troubleshooting

### Frontend Issues
```bash
# Clear Next.js cache
cd frontend
rm -rf .next
npm run dev
```

### Backend Issues
```bash
# Check environment variables
node -e "console.log(process.env)"

# Restart server
pkill -f "node server.js"
node server.js
```

### Database Connection
```bash
# Test PostgreSQL connection
docker exec -it whatsapp-postgres psql -U postgres -d whatsapp_db
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - See `LICENSE` file for details

---

## Author

**Fabari Agbora**

---

## Quick Links

- [Evolution API Docs](https://doc.evolution-api.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## Support

For issues or questions:
1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Include error logs and environment details

---

**Status:** 🚧 Active Development | MVP Complete, Backend Integration In Progress