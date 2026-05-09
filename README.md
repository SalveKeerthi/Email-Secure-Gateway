# 🛡️ SecureGate AI — Enterprise Email Security Gateway

> **Full-stack real-time Gmail threat detection platform.**
> Node.js + Express backend · React + Tailwind CSS frontend · MongoDB · Socket.IO · Google Gmail API

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Google Cloud Setup (OAuth2)](#google-cloud-setup-oauth2)
5. [Environment Variables](#environment-variables)
6. [Installation & Running](#installation--running)
7. [Backend — What Was Built](#backend--what-was-built)
8. [Frontend — What Was Built](#frontend--what-was-built)
9. [API Reference](#api-reference)
10. [Socket.IO Events](#socketio-events)
11. [AI Threat Detection Pipeline](#ai-threat-detection-pipeline)
12. [Gmail Label Automation](#gmail-label-automation)
13. [Deployment Guide](#deployment-guide)
14. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (React SPA)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐   │
│  │Dashboard │  │  Emails  │  │  Threats │  │ Settings   │   │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘   │
│         │              │ Axios REST              │          │
│         └──────────────┼─────────────────────────┘          │
│                        │ Socket.IO (WSS)                    │
└────────────────────────┼────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   Express API       │  :5000
              │   (Node.js)         │
              │                     │
              │  ┌───────────────┐  │
              │  │ Auth Routes   │  │  OAuth2 flow
              │  │ Email Routes  │  │  CRUD + search
              │  │ Gmail Routes  │  │  sync control
              │  │ Dashboard     │  │  aggregations
              │  │ Settings      │  │  preferences
              │  └───────────────┘  │
              │                     │
              │  ┌───────────────┐  │
              │  │ Background    │  │  node-schedule
              │  │ Scheduler     │  │  every 30s/1m/5m
              │  └───────────────┘  │
              │                     │
              │  ┌───────────────┐  │
              │  │ Ingestion     │  │  fetch → parse
              │  │ Pipeline      │  │  → classify → save
              │  └───────────────┘  │
              │                     │
              │  ┌───────────────┐  │
              │  │ AI Threat     │  │  7-module engine
              │  │ Detection     │  │  risk 0-100
              │  └───────────────┘  │
              └─────────┬─────-─────┘
                        │
          ┌─────────────┼───────────┐
          │             │           │
   ┌──────▼─────┐ ┌─────▼─────┐ ┌────▼────────┐
   │  MongoDB   │ │ Gmail API │ │ Socket.IO   │
   │  (emails,  │ │  v1       │ │  real-time  │
   │  accounts, │ │  OAuth2   │ │  events     │
   │  settings) │ └───────────┘ └─────────────┘
   └────────────┘
```

---

## Project Structure

```
securegate/
├── package.json                  ← monorepo root (concurrently dev)
├── .gitignore
│
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── .gitignore
│   └── src/
│       ├── server.js             ← entry point: HTTP + Socket.IO + scheduler
│       ├── app.js                ← Express app, middleware, routes
│       ├── config/
│       │   ├── database.js       ← Mongoose connection
│       │   ├── googleAuth.js     ← OAuth2 client factory
│       │   └── socket.js         ← Socket.IO init + emit helpers
│       ├── models/
│       │   ├── Email.js          ← email document schema
│       │   ├── GmailAccount.js   ← connected account + tokens
│       │   └── Settings.js       ← per-account preferences
│       ├── routes/
│       │   ├── authRoutes.js     ← GET /url, GET /callback, DELETE /disconnect
│       │   ├── emailRoutes.js    ← incoming / quarantined / blocked / search
│       │   ├── gmailRoutes.js    ← accounts, sync, monitoring toggle
│       │   ├── dashboardRoutes.js← stats, recent emails, timeline
│       │   └── settingsRoutes.js ← GET + PATCH settings
│       ├── services/
│       │   ├── gmailService.js   ← Gmail API wrapper (fetch, labels, history)
│       │   ├── threatDetectionService.js ← 7-module AI classifier
│       │   ├── ingestionService.js       ← full pipeline orchestrator
│       │   └── schedulerService.js       ← node-schedule job manager
│       ├── middleware/
│       │   └── errorHandler.js
│       └── utils/
│           └── logger.js         ← Winston logger
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── .env.example
    └── src/
        ├── main.jsx              ← ReactDOM root
        ├── App.jsx               ← Router + GmailProvider wrapper
        ├── index.css             ← Tailwind directives + custom anims
        ├── contexts/
        │   └── GmailContext.jsx  ← global state: connection, emails, alerts
        ├── hooks/
        │   └── useEmails.js      ← paginated email fetching hook
        ├── services/
        │   ├── api.js            ← Axios instance + all API calls
        │   └── socket.js         ← Socket.IO client + event constants
        ├── components/
        │   ├── common/
        │   │   ├── index.jsx     ← all shared UI (badges, cards, etc.)
        │   │   ├── Sidebar.jsx   ← navigation sidebar
        │   │   └── TopBar.jsx    ← header with search + alerts bell
        │   ├── inbox/
        │   │   ├── OnboardingModal.jsx
        │   │   └── PipelineModal.jsx
        │   └── emails/
        │       └── EmailTable.jsx
        └── pages/
            ├── Dashboard.jsx
            ├── InboxIntegration.jsx
            ├── EmailPages.jsx        ← Incoming / Quarantined / Blocked
            ├── ThreatIntel.jsx
            ├── SearchPage.jsx
            ├── ManualScanner.jsx
            └── SettingsPage.jsx
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 18 | Backend runtime |
| npm | ≥ 9 | Package manager |
| MongoDB | ≥ 6 | Database (local or Atlas) |
| Google Cloud account | — | Gmail OAuth2 credentials |

---

## Google Cloud Setup (OAuth2)

This is the most critical step. Follow exactly:

### 1 — Create a Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Click **New Project** → name it `SecureGate`
3. Select the project

### 2 — Enable APIs

Navigate to **APIs & Services → Library** and enable:
- **Gmail API**
- **Google People API** (for user profile)

### 3 — Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Choose **External** (or Internal if Google Workspace)
3. Fill in:
   - App name: `SecureGate AI`
   - User support email: your email
   - Developer contact: your email
4. Click **Save and Continue**
5. Under **Scopes**, add:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
6. Under **Test users**, add your Gmail address
7. Save

### 4 — Create OAuth2 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth 2.0 Client IDs**
3. Application type: **Web application**
4. Name: `SecureGate Backend`
5. Authorized redirect URIs: `http://localhost:5000/api/auth/gmail/callback`
6. Click **Create**
7. Copy **Client ID** and **Client Secret**

---

## Environment Variables

### Backend: `backend/.env`

```env
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/securegate

# Google OAuth2 (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/gmail/callback

# JWT
JWT_SECRET=change_this_to_a_long_random_string_in_production

# Frontend URL (must match your React dev server)
FRONTEND_URL=http://localhost:3000

# AI Thresholds
BLOCK_THRESHOLD=80
QUARANTINE_THRESHOLD=50

# Gmail Sync
DEFAULT_SYNC_INTERVAL_SECONDS=30
MAX_EMAILS_PER_SYNC=50
```

### Frontend: `frontend/.env`

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

---

## Installation & Running

```bash
# 1. Clone the repo
git clone https://github.com/yourorg/securegate.git
cd securegate

# 2. Install all dependencies
npm run install:all

# 3. Set up environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit both files with your credentials

# 4. Start MongoDB (if running locally)
mongod --dbpath /usr/local/var/mongodb

# 5. Run both backend + frontend concurrently
npm run dev

# OR run separately:
cd backend && npm run dev    # http://localhost:5000
cd frontend && npm run dev   # http://localhost:3000
```

Open http://localhost:3000 — the onboarding modal will appear.

---

## Backend — What Was Built

### `server.js`
Entry point. Bootstraps in order:
1. Connects to MongoDB
2. Creates HTTP server from Express app
3. Attaches Socket.IO to the HTTP server
4. Starts the background scheduler
5. Listens on PORT

### `app.js`
Express app setup with:
- **Helmet** — security headers
- **Compression** — gzip responses
- **CORS** — restricted to frontend URL
- **Rate limiting** — 500 req/15min per IP
- **Morgan** — HTTP access logging via Winston
- All route prefixes mounted

### `config/database.js`
Mongoose connection with auto-reconnect on disconnect.

### `config/googleAuth.js`
Factory functions for OAuth2 client. `createAuthedClient()` sets credentials and listens for auto-refreshed tokens — so access tokens are **automatically renewed** before expiry without user intervention.

### `config/socket.js`
Socket.IO server initialisation. Exports named `emit*` helpers used by the ingestion pipeline to push live events to all connected browser tabs:
- `emitSyncStarted` / `emitSyncProgress` / `emitSyncCompleted`
- `emitNewThreatDetected`
- `emitEmailQuarantined` / `emitEmailBlocked` / `emitEmailAllowed`
- `emitConnectionError`

### `models/Email.js`
Mongoose schema with 30+ fields including:
- Gmail identifiers (`email_id`, `gmail_thread_id`)
- Parsed content (`sender`, `subject`, `body_text`, `urls`, `attachments`, `headers`)
- AI results (`risk_score`, `threat_type`, `confidence_score`, `threat_indicators`)
- Auth results (`spf_result`, `dkim_result`, `dmarc_result`)
- Decision (`status`: ALLOW / QUARANTINE / BLOCK, `gmail_label`)
- Full-text search index on `sender + subject + threat_type`

### `models/GmailAccount.js`
Stores the connected Gmail account with OAuth tokens. Tracks `last_history_id` (used for incremental Gmail History API fetches), `emails_synced_today`, `last_sync`. Has `resetDailyCounters()` method.

### `models/Settings.js`
Per-account user preferences: thresholds, sync interval, notification toggles, auto-label flag.

### `services/gmailService.js`
All Gmail API calls:
- **`getGmailService(account)`** — creates an authenticated Gmail client using stored tokens
- **`ensureLabelsExist(gmail)`** — creates `AI-SAFE`, `AI-QUARANTINE`, `AI-BLOCKED` labels in the user's Gmail if they don't exist
- **`fetchNewEmails(gmail, lastHistoryId, maxResults)`** — uses History API for incremental fetches (only messages added since last run); falls back to full list on first run or expired history ID
- **`getMessageDetails(gmail, messageId)`** — fetches raw RFC2822 message, parses with `mailparser`, extracts URLs, headers, attachments
- **`applyLabel(gmail, messageId, labelId)`** — moves email into the appropriate AI label

### `services/threatDetectionService.js`
The AI detection engine. Pure JavaScript, runs synchronously, no external ML API required:

| Module | What it checks | Max score contribution |
|--------|---------------|----------------------|
| Header Analysis | SPF/DKIM/DMARC failures, From/Return-Path mismatch | 85 |
| Keyword Detection | 25 phishing keywords + 10 BEC keywords in subject+body | 60 |
| URL Analysis | Suspicious URL patterns, URL shorteners, 10+ URLs in email | 40 |
| Domain Similarity | Levenshtein distance ≤ 2 from 15 trusted domains (typosquatting) | 35 |
| Attachment Analysis | Dangerous file extensions (.exe, .bat, .vbs…), double extension trick | 70 |

Final `risk_score` = sum of all modules, capped at 100.

**Policy decision:**
- `risk_score ≥ BLOCK_THRESHOLD (80)` → `BLOCK`
- `risk_score ≥ QUARANTINE_THRESHOLD (50)` → `QUARANTINE`
- `risk_score < 50` → `ALLOW`

### `services/ingestionService.js`
Orchestrates the complete pipeline for one Gmail account. Called by the scheduler every N seconds:
1. Load account from MongoDB
2. Check monitoring is enabled
3. Emit `syncStarted` to all browsers
4. Create Gmail service client
5. Ensure labels exist
6. Fetch new emails via History API
7. For each email:
   a. Skip if already in DB (idempotent)
   b. Run threat detection
   c. Save to MongoDB
   d. Apply Gmail label
   e. Emit `emailAllowed/Quarantined/Blocked`
8. Update `last_history_id` and sync stats
9. Emit `syncCompleted`

### `services/schedulerService.js`
Manages `node-schedule` jobs. On startup, loads all `connected` accounts and schedules a recurring job for each. When settings change (interval or monitoring toggle), the old job is cancelled and a new one created. Supports 30s, 60s, 300s, or manual-only modes.

### Route files
| File | Routes |
|------|--------|
| `authRoutes.js` | `GET /api/auth/gmail/url` → OAuth URL · `GET /api/auth/gmail/callback` → token exchange + redirect · `DELETE /api/auth/gmail/disconnect/:id` |
| `emailRoutes.js` | `GET /api/emails/incoming` · `/quarantined` · `/blocked` · `/search` · `POST /api/emails/manual-scan` |
| `gmailRoutes.js` | `GET /api/gmail/accounts` · `POST /api/gmail/accounts/:id/sync` · `PATCH /api/gmail/accounts/:id/monitoring` |
| `dashboardRoutes.js` | `GET /api/dashboard/stats` · `/recent-emails` · `/timeline` |
| `settingsRoutes.js` | `GET /api/settings/:accountId` · `PATCH /api/settings/:accountId` |

---

## Frontend — What Was Built

### `contexts/GmailContext.jsx`
React Context that serves as the **single source of truth** for the entire frontend. Every page reads from here. Responsibilities:
- Persists account to `localStorage` so refresh doesn't log you out
- Detects `?oauth=success` / `?oauth=error` in URL after OAuth callback and sets state accordingly
- Opens Socket.IO connection and sets up all event listeners
- Provides `connectGmail()` (redirects to backend OAuth URL), `disconnectGmail()`, `syncNow()`
- Maintains live `emails[]` array (up to 200, prepended on new arrivals), `alerts[]`, `stats{}`

### `services/api.js`
Centralised Axios instance with base URL, request interceptor (attaches JWT), response interceptor (unwraps errors). Exports namespaced API objects: `authApi`, `gmailApi`, `emailApi`, `dashboardApi`, `settingsApi`.

### `services/socket.js`
Socket.IO client singleton. `getSocket()` creates the connection once and returns the same instance on every call. Exports `SOCKET_EVENTS` constants to keep event names in sync with the backend.

### `components/common/index.jsx`
All shared atomic components:
- `ScoreBadge` — coloured risk % pill (green/amber/red)
- `ActionBadge` — ALLOW/QUARANTINE/BLOCK pill
- `LabelBadge` — AI-SAFE/AI-QUARANTINE/AI-BLOCKED pill
- `SeverityBadge` — Low/Medium/High/Critical
- `SourceBadge` — Gmail/Manual/SMTP pill
- `ConnStatusBadge` — animated dot + text
- `AuthBadge` — SPF/DKIM/DMARC pass/fail
- `StatCard` — dashboard KPI card
- `TimeAgo` — human-relative timestamp via `date-fns`
- `PageHeader` — consistent page title + action row
- `EmptyState` — centred icon + message
- `Spinner` — size-variants CSS spinner
- `ErrorAlert` — red banner with Retry button
- `Toggle` — accessible switch button
- `Pagination` — prev/next page controls

### `components/common/Sidebar.jsx`
`react-router-dom` NavLink-based nav. Reads `stats.quarantined` and `stats.blocked` from context to show live badge counts. Active item gets blue background.

### `components/common/TopBar.jsx`
- Global search input — pressing Enter navigates to `/search?q=…`
- Animated sync progress bar (appears only while `topBarSyncing === true`)
- Notification bell with dropdown showing last 20 alerts with severity badges
- User avatar (first letter of Gmail address)

### `components/inbox/OnboardingModal.jsx`
First-time welcome screen with 3-step explanation. Appears whenever `gmailStatus === 'Not Connected'` and the user hasn't dismissed it. "Connect Gmail Now" calls `connectGmail()` from context.

### `components/inbox/PipelineModal.jsx`
Shows all 7 pipeline stages. Reads `syncStage` from context to highlight the active one with animated bouncing dots. Progress bar driven by `syncProgress` (0–100). Auto-shows when `isSyncing` becomes `true`.

### `components/emails/EmailTable.jsx`
Reusable table for all three email lists. Shows sender, subject (with threat type), label, risk score, SPF/DKIM/DMARC auth badges, action, source, and relative time. New emails (in `newEmailIds`) get a blue flash animation. Includes pagination.

### Pages

| Page | Route | Purpose |
|------|-------|---------|
| `Dashboard` | `/` | KPIs, inbox status widget, live email stream, alerts panel, threat breakdown |
| `InboxIntegration` | `/inbox` | Connect/disconnect Gmail, OAuth scope info, error guidance |
| `IncomingEmailsPage` | `/emails` | Paginated all emails with search |
| `QuarantinedEmailsPage` | `/quarantine` | Only QUARANTINE status |
| `BlockedEmailsPage` | `/blocked` | Only BLOCK status |
| `ThreatIntel` | `/threats` | Threat type cards, auth summary, high-risk table |
| `SearchPage` | `/search` | Full-text search across all Gmail-ingested emails |
| `ManualScanner` | `/scanner` | Paste email or raw RFC2822 for one-off scan |
| `SettingsPage` | `/settings` | Monitoring toggle, sync interval, connected accounts, thresholds, notifications |

### `hooks/useEmails.js`
Custom hook wrapping `emailApi.getIncoming/getQuarantined/getBlocked`. Manages pagination state, search query, loading/error, and exposes `refresh()`, `goToPage()`, `handleSearch()`. Re-fetches automatically when `accountId` changes.

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/gmail/url` | Get Google OAuth2 consent URL |
| GET | `/api/auth/gmail/callback?code=…` | Exchange code for tokens, redirect to frontend |
| GET | `/api/auth/gmail/status?email=…` | Get connection status |
| DELETE | `/api/auth/gmail/disconnect/:id` | Disconnect and clear tokens |

### Emails

| Method | Endpoint | Query Params | Description |
|--------|----------|-------------|-------------|
| GET | `/api/emails/incoming` | `page`, `search`, `accountId` | All processed emails |
| GET | `/api/emails/quarantined` | `page`, `search`, `accountId` | QUARANTINE only |
| GET | `/api/emails/blocked` | `page`, `search`, `accountId` | BLOCK only |
| GET | `/api/emails/search` | `q`, `accountId` | Full-text search |
| GET | `/api/emails/:id` | — | Single email detail |
| POST | `/api/emails/manual-scan` | Body: `{raw_email}` or `{sender, subject, body}` | One-off threat scan |

### Gmail Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gmail/accounts` | List all connected accounts |
| POST | `/api/gmail/accounts/:id/sync` | Trigger immediate sync |
| PATCH | `/api/gmail/accounts/:id/monitoring` | Toggle monitoring + set interval |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Aggregated KPIs, today's stats, threat breakdown |
| GET | `/api/dashboard/recent-emails` | Last N emails for live stream |
| GET | `/api/dashboard/timeline` | Hourly volume for last 24h |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings/:accountId` | Get account settings |
| PATCH | `/api/settings/:accountId` | Update settings (any field) |

---

## Socket.IO Events

| Event (Server → Client) | Payload | When |
|------------------------|---------|------|
| `syncStarted` | `{ account, stages[], timestamp }` | Sync begins |
| `syncProgress` | `{ stage, stageName, percent }` | Each pipeline stage |
| `syncCompleted` | `{ account, processed, threats, duration }` | Sync ends |
| `newThreatDetected` | Email document | Any QUARANTINE or BLOCK |
| `emailQuarantined` | Email document | Status = QUARANTINE |
| `emailBlocked` | Email document | Status = BLOCK |
| `emailAllowed` | Email document | Status = ALLOW |
| `connectionError` | `{ message }` | Auth/API failure |

---

## AI Threat Detection Pipeline

```
Raw Email
    │
    ▼
┌─────────────────────────┐
│ 1. Header Analysis      │  SPF, DKIM, DMARC, From≠ReturnPath
│    Score: 0–85          │
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ 2. Keyword Detection    │  25 phishing + 10 BEC patterns
│    Score: 0–60          │
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ 3. URL Analysis         │  Shorteners, suspicious TLDs, patterns
│    Score: 0–40          │
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ 4. Domain Similarity    │  Levenshtein ≤2 vs 15 trusted domains
│    Score: 0–35          │
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ 5. Attachment Analysis  │  Dangerous ext, double extension
│    Score: 0–70          │
└────────────┬────────────┘
             ▼
         Raw Score
             │
    cap at 100 → risk_score
             │
    ┌────────┴────────┐
    │  Policy Engine  │
    │  ≥80  → BLOCK   │
    │  ≥50  → QUARANTINE
    │  <50  → ALLOW   │
    └─────────────────┘
```

**To extend with an ML model:** replace the `classifyEmail()` function body in `threatDetectionService.js` with a call to a Python microservice or OpenAI function call, passing the same `emailData` object. The rest of the pipeline stays unchanged.

---

## Gmail Label Automation

On first connect, SecureGate creates three coloured labels in the user's Gmail:

| Label | Color | Applied when |
|-------|-------|-------------|
| `AI-SAFE` | Green | risk_score < 50 |
| `AI-QUARANTINE` | Yellow | risk_score 50–79 |
| `AI-BLOCKED` | Red | risk_score ≥ 80 |

Labels are visible in Gmail's sidebar. The History API's `startHistoryId` is saved after each sync so only **new messages** are fetched on subsequent runs — no duplicate processing.

---

## Deployment Guide

### Backend (e.g. Railway / Render / EC2)

```bash
cd backend
npm install --production
# Set all env vars in platform dashboard
npm start
```

Set `GOOGLE_REDIRECT_URI` to your production URL:
```
https://api.yourdomain.com/api/auth/gmail/callback
```

Add this exact URI to the **Authorized redirect URIs** in Google Cloud Console.

### Frontend (e.g. Vercel / Netlify)

```bash
cd frontend
npm install
VITE_API_URL=https://api.yourdomain.com npm run build
# Deploy the dist/ folder
```

### MongoDB Atlas

Replace `MONGODB_URI` with your Atlas connection string:
```
mongodb+srv://user:pass@cluster.mongodb.net/securegate?retryWrites=true
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `redirect_uri_mismatch` | Ensure `GOOGLE_REDIRECT_URI` in `.env` exactly matches the URI in Google Cloud Console |
| `invalid_client` | Double-check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` |
| `Access blocked: app not verified` | Add your Gmail as a test user in OAuth Consent Screen |
| Emails not appearing | Check MongoDB is running; check backend logs for scheduler output |
| Socket not connecting | Ensure `VITE_SOCKET_URL` points to the correct backend port |
| Labels not created | Account needs `gmail.modify` scope — reconnect Gmail |
| `historyId not found` | Harmless — backend auto-falls back to full fetch on next cycle |
| CORS errors | Ensure `FRONTEND_URL` in backend `.env` matches your React dev port |

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 + Vite |
| Styling | Tailwind CSS 3 |
| Routing | React Router v6 |
| HTTP client | Axios |
| Real-time | Socket.IO client |
| Date formatting | date-fns |
| Backend framework | Express 4 |
| Database | MongoDB + Mongoose |
| Real-time server | Socket.IO |
| Gmail API | googleapis (Node.js) |
| Email parsing | mailparser |
| Scheduling | node-schedule |
| Domain parsing | tldts |
| Logging | Winston |
| Security | Helmet, express-rate-limit |

---

*SecureGate AI — Built for SOC teams requiring real-time Gmail threat visibility.*
