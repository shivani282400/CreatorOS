# CreatorOS

**An AI-native content operating system for creators: generate, evaluate, store, schedule, measure, learn.**

CreatorOS is a full-stack app where every piece of content you save makes the next generation better. It combines multi-provider LLM generation, a per-user **RAG memory** (pgvector), a content library, a scheduling calendar and performance analytics into one closed loop.

> **Live demo:** `https://YOUR-APP.vercel.app` · **Demo login:** click **“Try the demo account”** on the login page (or use `demo@creatoros.app` with the password you set in `DEMO_PASSWORD`)

---

## Table of contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [RAG memory pipeline](#rag-memory-pipeline)
4. [Tech stack](#tech-stack)
5. [Project structure](#project-structure)
6. [Run it locally](#run-it-locally)
7. [Environment variables](#environment-variables)
8. [Authentication and email codes](#authentication-and-email-codes)
9. [Deploy (Render + Vercel)](#deploy-render--vercel)
10. [API reference](#api-reference)
11. [Testing](#testing)
12. [Database management](#database-management)
13. [Security notes](#security-notes)
14. [Troubleshooting](#troubleshooting)

---

## Features

| Area | What you get |
| --- | --- |
| **Generation** | Script, hooks, captions and a thread per topic, tuned to platform, tone, goal and audience. Groq first, OpenRouter as automatic fallback. |
| **Live streaming** | The script appears as the model writes it (Server-Sent Events), with a Stop button and an automatic fallback to normal mode if streaming is unavailable. |
| **RAG memory** | Your saved scripts, hooks, captions and an optional brand brief (PDF/DOCX) are embedded and retrieved so new drafts sound like *you*. |
| **AI scoring** | Every draft is scored (hook strength, emotion, engagement, structure, platform fit) with written feedback and improvement tips. |
| **Library** | Saved content grouped with near-duplicate versions, plus improve and “generate like this” actions. |
| **Calendar** | Schedule content, then log views, likes, comments and shares after publishing. |
| **Insights dashboard** | Weekly summary, 8-week trend chart, platform breakdown, best-performing hooks, top posts, engagement rate, plus the **Content DNA** style profile. |
| **Export** | Copy text, copy or download **Markdown for Notion**, **Save as PDF**. Calendar as **CSV** (Notion/Sheets), **.ics** (Google/Apple/Outlook), Markdown table or PDF. |
| **Auth** | Email + password, optional email one-time codes, rotating refresh sessions, rate limiting. |

---

## Architecture

```mermaid
flowchart LR
    subgraph Client["React + Vite (Vercel)"]
        UI["Pages: Dashboard, Generate, Library, Calendar, Profile"]
        API["api.ts: auth refresh, SSE reader"]
    end

    subgraph Server["Fastify API (Render)"]
        AUTH["Auth: JWT + refresh sessions, rate limits"]
        AIR["AI routes: generate, stream, improve, like"]
        MEM["Memory service: embed, retrieve, summarise"]
        INS["Insights service: SQL analytics"]
        OTP["OTP + email (optional)"]
    end

    subgraph Data["Postgres + pgvector (Supabase)"]
        T1[("users, content, calendar")]
        T2[("memory_embeddings vector 1536")]
        T3[("auth_otps, auth_refresh_sessions")]
    end

    subgraph Providers["External AI"]
        G["Groq (primary LLM)"]
        O["OpenRouter (fallback LLM)"]
        E["OpenAI / OpenRouter (embeddings)"]
    end

    UI --> API --> AUTH
    API --> AIR
    API --> INS
    AIR --> MEM
    AIR --> G
    AIR -.fallback.-> O
    MEM --> E
    MEM --> T2
    AUTH --> T3
    OTP --> T3
    INS --> T1
    AIR --> T1
```

**Key design decisions**

- **Drafts are not saved automatically.** `/ai/generate` and `/ai/generate/stream` return a draft; the client saves it with `POST /content` only when the user clicks *Save*. The library stays clean and only approved content feeds the memory.
- **Graceful degradation.** No embedding key: generation still works, just without memory. No email provider: the login page hides the email-code option. Primary LLM down: the next configured provider is used.
- **Insights are plain SQL**, not LLM calls, so the dashboard is instant, free and deterministic.

---

## RAG memory pipeline

CreatorOS uses retrieval-augmented generation to keep output consistent with each creator’s own voice.

```mermaid
sequenceDiagram
    autonumber
    actor U as Creator
    participant API as Fastify API
    participant EMB as Embedding provider
    participant DB as Postgres + pgvector
    participant LLM as Groq / OpenRouter

    rect rgb(30, 41, 59)
    Note over U,DB: Write path - every saved piece becomes memory
    U->>API: POST /content (script, hooks, captions, score)
    API->>DB: INSERT content
    API->>EMB: embed script, each hook, each caption
    EMB-->>API: 1536-d vectors
    API->>DB: INSERT memory_embeddings (type, score, style features)
    end

    rect rgb(15, 23, 42)
    Note over U,LLM: Read path - every generation retrieves it
    U->>API: POST /ai/generate/stream (topic, platform, goal)
    API->>EMB: embed topic + goal + audience
    API->>DB: nearest neighbours per type (script, hook, caption)
    DB-->>API: best matches, dominant style, brand brief
    API->>API: build prompt (Library DNA + past work + brand)
    API->>LLM: stream completion (JSON)
    LLM-->>API: tokens
    API-->>U: SSE delta events (script appears live)
    API->>API: validate JSON schema, check score consistency
    API-->>U: done (script, hooks, captions, thread, score)
    end
```

### What is stored

Table `memory_embeddings(user_id, content_id, type, content, embedding vector(1536), score, style, ...)`

| `type` | Source | Purpose |
| --- | --- | --- |
| `script` | Saved script | Voice, structure and pacing examples |
| `hook` | Each saved hook | Opening-line patterns that worked |
| `caption` | Each saved caption | Caption length and tone |
| `brand` | Uploaded PDF/DOCX brief | Optional brand guidelines |
| `summary` | AI-written profile of the library | Shown on the dashboard |

Embeddings come from OpenAI `text-embedding-3-small` (1536 dimensions), or the same model through OpenRouter when no OpenAI key is set. An HNSW index on the vector column keeps retrieval fast.

### How retrieval works

1. The topic, goal and audience of the new request are embedded.
2. For each memory type, the closest vectors for **that user only** are fetched using cosine distance (`<=>`).
3. Results are re-ranked with a small **quality bias**: `distance - score * 0.01`, so well-scoring past work is preferred over equally similar weaker work.
4. The **dominant style** of the user’s top-scoring scripts is computed (tone, hook type, structure, caption length). This is the *Content DNA* shown on the dashboard.
5. Everything is assembled into the prompt in a fixed order:

```
Library DNA Style Insights        <- primary source of truth
Brand Guidelines                  <- optional, from the uploaded brief
Past Scripts / Hooks / Captions   <- retrieved examples
FINAL INSTRUCTION                 <- sound like this creator, not generic AI
```

### Output validation

The model must return JSON. The server cleans code fences, parses it, validates it with a **Zod** schema and checks that the reported `score` is consistent with its five sub-scores (within 10 points). On failure it retries with a stricter prompt, then falls through to the next provider. Raw provider errors are logged on the server and never shown to users.

### Streaming

`POST /ai/generate/stream` returns `text/event-stream`:

| Event | Payload |
| --- | --- |
| `status` | `{ stage, usedBrand?, usedMemory? }` |
| `delta` | `{ text }`: the script so far, extracted from the partial JSON as it arrives |
| `done` | `{ data, meta }`: the validated final result |
| `error` | `{ error }`: a safe, user-readable message |

A keep-alive comment is sent every 15 s so proxies do not close idle connections.

---

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Framer Motion, Sonner
- **Backend:** Node 20+, Fastify 5, TypeScript, Zod, bcrypt, `@fastify/jwt`, `@fastify/cookie`, `@fastify/rate-limit`
- **Database:** PostgreSQL with `pgvector` (Supabase recommended)
- **AI:** Groq (`openai/gpt-oss-120b` by default), OpenRouter fallback, OpenAI / OpenRouter embeddings
- **Email (optional):** SMTP/Gmail, Brevo or Resend
- **Hosting:** Render (API) + Vercel (web)

---

## Project structure

```
CreatorOS/
├── CreatorOS-backend/
│   ├── src/
│   │   ├── app.ts, server.ts, config.ts     # app factory, startup, env rules
│   │   ├── plugins/db.ts                    # pool + idempotent schema
│   │   ├── routes/                          # auth, ai, content, calendar, performance, memory, insights, user
│   │   ├── services/
│   │   │   ├── ai/                          # groq, openrouter, aiService (fallback + streaming), prompts, contextBuilder
│   │   │   ├── memoryService.ts             # embed, retrieve, style DNA, summary
│   │   │   ├── insightsService.ts           # dashboard analytics
│   │   │   ├── otpService.ts, emailService.ts
│   │   │   └── demoService.ts               # optional demo account + sample data
│   │   ├── utils/                           # embedding, AI JSON schema, output cleaning
│   │   └── scripts/                         # migrate.ts, dbCheck.ts
│   ├── db/schema.sql                        # same schema, runnable by hand
│   └── test/                                # unit, OTP and end-to-end tests (+ mock AI server)
├── CreatorOS-frontend/
│   ├── src/
│   │   ├── pages/                           # Dashboard, Generate, Library, Calendar, Uploaded, Profile, Login
│   │   ├── components/                      # InsightsPanel, ContentDNA, library/*, ui/ (States, ExportMenu)
│   │   └── utils/                           # api (auth refresh), sse, exporters
│   └── vercel.json                          # SPA fallback + /api proxy to Render
├── render.yaml                              # Render blueprint
└── .github/workflows/ci.yml                 # build + tests (Postgres with pgvector)
```

---

## Run it locally

**Prerequisites:** Node 20+, and a Postgres database with the `vector` extension. A free Supabase project works, or run `docker run -e POSTGRES_PASSWORD=pw -p 5432:5432 pgvector/pgvector:pg16`.

```bash
# 1. Backend
cd CreatorOS-backend
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, OTP_HMAC_SECRET and an AI key
npm install
npm run dev                 # http://localhost:4000 (schema is created automatically)

# 2. Frontend (new terminal)
cd CreatorOS-frontend
npm install
npm run dev                 # http://localhost:5173
```

Generate secrets with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

**Minimum to try it:** `DATABASE_URL`, `JWT_SECRET`, `OTP_HMAC_SECRET` and `GROQ_API_KEY` (or `OPENROUTER_API_KEY`). Add `OPENAI_API_KEY` to switch on RAG memory.

Optional: set `DEMO_EMAIL`, `DEMO_PASSWORD` and `DEMO_SHOW_ON_LOGIN=true` for a ready-made demo account with sample content and a one-click button on the login page.

---

## Environment variables

The full, commented list is in [`CreatorOS-backend/.env.example`](CreatorOS-backend/.env.example).

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string (with pgvector) |
| `JWT_SECRET` | yes | Signs access tokens. **The server refuses to start without it.** |
| `OTP_HMAC_SECRET` | yes | Hashes email codes and refresh tokens |
| `FRONTEND_URL` | in production | Comma-separated allowed browser origins (CORS) |
| `GROQ_API_KEY` / `OPENROUTER_API_KEY` | one of them | Text generation (Groq first, OpenRouter fallback) |
| `OPENAI_API_KEY` | recommended | Embeddings for RAG (falls back to OpenRouter) |
| `GROQ_MODEL`, `OPENROUTER_MODEL` | no | Override the default models |
| `TRUST_PROXY` | in production | `true` behind Render/Vercel so rate limits see real client IPs |
| `COOKIE_SAMESITE`, `ACCESS_TOKEN_TTL` | no | Cookie and token tuning (see [Troubleshooting](#troubleshooting)) |
| `EMAIL_PROVIDER` + provider variables | no | Enables email sign-in codes (see below) |
| `DEMO_EMAIL`, `DEMO_PASSWORD`, `DEMO_SHOW_ON_LOGIN` | no | Shared demo account |
| `ALLOW_REGISTRATION` | no | `false` closes public sign-ups |

Frontend: `VITE_API_URL` (optional, see [Deploy](#deploy-render--vercel)).

---

## Authentication and email codes

- **Password sign-in** (default): bcrypt (cost 12), per-IP rate limits, the same error for “unknown email” and “wrong password”, and a constant-time comparison so response time does not reveal which emails exist.
- **Email codes (OTP)** (optional): 6 digits, hashed at rest, 5-minute expiry, 5 attempts, 60 s resend cooldown, per-email, per-IP and global daily caps.
- **Sessions:** a short-lived access token (15 min) plus an HttpOnly, rotating refresh cookie (7 days). Refresh tokens are single use.
- **Accounts created with a code** have no password until you set one under **Profile → Password**. After that, both methods work.

The login page asks `GET /auth/config` which methods the server offers. **If no email provider is configured, the email-code option does not appear.** That is the intended setup on free hosting.

### Choosing an email provider

| Provider | Variables | Notes |
| --- | --- | --- |
| **SMTP / Gmail** | `SMTP_USER`, `SMTP_PASS` (a Gmail *App Password*) | Great for local development. **Render’s free tier blocks SMTP ports**, so it will not work there. |
| **Brevo** | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | HTTPS API, works on Render’s free tier, about 300 emails a day free. |
| **Resend** | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Needs a verified domain to email anyone except your own account. |

Set `OTP_ENABLED=false` to switch codes off entirely, and `OTP_DAILY_LIMIT` (default 90) to protect a free email quota.

---

## Deploy (Render + Vercel)

### 1. Database (Supabase)

Create a project, open **Settings → Database → Connection pooling** and copy the pooler URL. Supabase’s direct host is IPv6-only on the free plan, while the pooler works everywhere (including Render), so use the pooler. The schema is created automatically on first start and is safe to run against an existing database.

### 2. Backend on Render

1. **New → Blueprint** and select this repo (it reads [`render.yaml`](render.yaml)), or create a Web Service manually:
   - Root directory `CreatorOS-backend`
   - Build: `npm ci --include=dev && npm run build`
   - Start: `npm start`
   - Health check: `/health`
2. Set the secret variables: `DATABASE_URL`, `FRONTEND_URL`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `DEMO_PASSWORD`. (`JWT_SECRET` and `OTP_HMAC_SECRET` are generated for you.)
3. **Do not** add SMTP variables on Render’s free tier.

### 3. Frontend on Vercel

Project settings: root directory `CreatorOS-frontend`, framework Vite. Then pick one way to reach the API:

**Option A, same-origin proxy (recommended).** Edit [`CreatorOS-frontend/vercel.json`](CreatorOS-frontend/vercel.json) and replace `YOUR-RENDER-SERVICE` with your Render hostname. The browser then talks only to your Vercel domain, so cookies are first-party and work in every browser, including Safari. Leave `VITE_API_URL` empty and set `COOKIE_SAMESITE=lax` on Render. Live token streaming through a proxy can be buffered; the app still works and simply shows the script when it is ready.

**Option B, direct.** Set `VITE_API_URL=https://your-service.onrender.com` on Vercel and `FRONTEND_URL=https://your-app.vercel.app` on Render. Streaming arrives live. Safari and Firefox may block the cross-site refresh cookie, so sessions end when the access token expires; raise `ACCESS_TOKEN_TTL` (for example `12h`) if that matters for your demo.

### 4. Post-deploy checklist

- [ ] `GET https://<api>/health/ready` returns `{"status":"ok","database":"up"}`
- [ ] The login page shows **Try the demo account**, and it signs you in
- [ ] The dashboard shows the sample insights
- [ ] **Generate** produces a draft (the first request after idle can take 30 to 60 s on Render’s free tier)
- [ ] Save a draft, generate again, and check the badge says memories were recalled (`GET /ai/status` shows `ragEnabled: true`)

---

## API reference

All routes except `/health*`, `/auth/*` and `GET /` need `Authorization: Bearer <token>`.

| Method | Route | Description |
| --- | --- | --- |
| GET | `/health`, `/health/ready` | Liveness, and readiness (database ping) |
| GET | `/auth/config` | Which sign-in methods exist, plus optional demo credentials |
| POST | `/auth/register`, `/auth/login` | Password auth |
| POST | `/auth/otp/send`, `/auth/otp/verify` | Email-code auth (when enabled) |
| POST | `/auth/refresh`, `/auth/logout` | Rotate or revoke the refresh session |
| POST | `/auth/password` | Set or change your password |
| GET / PUT | `/user/profile` | Niche, tone and platform preferences |
| GET | `/ai/status` | Configured providers and whether RAG is on (no secrets) |
| POST | `/ai/generate` | Generate a draft (JSON) |
| POST | `/ai/generate/stream` | Generate a draft (Server-Sent Events) |
| POST | `/ai/improve`, `/ai/generate-like` | Improve or vary a saved piece |
| GET / POST | `/content` | List or save content |
| DELETE | `/content/:id` | Delete your content |
| GET | `/content/search`, `/content/top-performing`, `/content/uploaded` | Semantic search, best posts, past-due posts |
| GET | `/calendar` | Calendar items |
| POST | `/calendar/schedule` | Schedule content |
| POST | `/performance/add`, `/performance/publish` | Log results, mark as published |
| GET | `/insights/overview` | Dashboard analytics |
| GET | `/memory/summary`, `/memory/status`, `/memory/search` | Memory profile, status, vector search |
| POST / DELETE | `/memory/upload-brand`, `/memory/brand` | Brand brief (PDF/DOCX) |
| POST | `/memory/backfill` | Re-embed existing content |

---

## Testing

```bash
cd CreatorOS-backend
export TEST_DATABASE_URL=postgres://user:pass@localhost:5432/creatoros_test   # the name must contain "test"
npm test
```

`npm test` builds the project and runs:

- **Unit tests:** streaming JSON extraction, config rules (JWT secret, CORS), email provider detection.
- **OTP tests:** rate limits, expiry and single use, with a mocked database.
- **End-to-end tests (18 scenarios):** the real Fastify app on real Postgres + pgvector, with a **mock AI provider** (`test/helpers/mockAiServer.cjs`) so no API keys are needed. They cover registration and login edge cases, refresh-token rotation, CORS, SSE streaming, **RAG write and retrieval** (saved content is embedded and appears in the next prompt), Groq to OpenRouter fallback, safe error messages, ownership checks, insights maths, the demo account and rate limiting.

Without `TEST_DATABASE_URL` the end-to-end suite is skipped. CI runs everything against a `pgvector/pgvector:pg16` service.

> The mock proves the wiring, validation and fallbacks. It does not replace one real call to Groq, OpenRouter and OpenAI: after deploying, check `GET /ai/status` and run a real generation.

---

## Database management

The app works with an existing Supabase/Postgres database. The schema uses only `CREATE ... IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`, and never drops or rewrites data.

```bash
cd CreatorOS-backend
npm run build
npm run db:check     # read-only report: version, pgvector, row counts, orphans, duplicate emails
npm run db:migrate   # apply the schema (also runs automatically on every server start)
```

- Emails are matched case-insensitively, so older accounts such as `Name@Gmail.com` still sign in and no duplicates are created.
- The same SQL lives in `db/schema.sql` if you prefer the Supabase SQL editor.
- Back up before big changes: Supabase → Database → Backups, or `pg_dump "$DATABASE_URL" > backup.sql`.

---

## Security notes

- The server **refuses to start** without `JWT_SECRET` (no default fallback), and the old `supersecret` value is rejected.
- **CORS is an allow-list** (`FRONTEND_URL`); localhost is allowed only outside production.
- The debug endpoint that exposed database errors was removed; `GET /health/ready` reports only up or down.
- Request bodies are validated with Zod, and API errors never include provider or database internals.
- Rate limits cover login, registration, OTP, refresh and AI generation.
- Users can only read, schedule, improve or delete their **own** content (ownership is checked in SQL).
- Refresh tokens are hashed, single use and sent in an HttpOnly, Secure cookie.
- Security headers (`nosniff`, `X-Frame-Options`, `Referrer-Policy`) are set on every response.
- `.env` files are git-ignored. **Rotate any key that has ever been shared in a zip, screenshot or chat.**

---

## Troubleshooting

| Symptom | Likely cause and fix |
| --- | --- |
| Server exits with “JWT_SECRET is not set” | Add `JWT_SECRET` (and `OTP_HMAC_SECRET`) to the environment. |
| Login page shows only password sign-in | No email provider is configured. This is expected; add SMTP, Brevo or Resend variables to enable codes. |
| Email code never arrives | Check the server log for `[otp] email send failed`. Resend only emails your own address until a domain is verified; Render’s free tier blocks SMTP (use Brevo there). |
| First request is very slow | Render’s free tier sleeps when idle. The app shows a “waking up the server” message. |
| Logged out after about 15 minutes | The refresh cookie was blocked as cross-site (Safari/Firefox). Use the Vercel `/api` rewrite (Option A) or raise `ACCESS_TOKEN_TTL`. |
| Browser CORS error | Add your exact frontend origin (no trailing slash) to `FRONTEND_URL`. |
| Generation says “not configured” | Set `GROQ_API_KEY` or `OPENROUTER_API_KEY`. |
| Generation says the AI model is “no longer available” | Providers retire models (Groq shut down `llama-3.3-70b-versatile` on 2026-08-16). Set `GROQ_MODEL` / `OPENROUTER_MODEL` to a current model and restart. |
| Output doesn’t sound like me | RAG needs an embedding key (`OPENAI_API_KEY`) and a few saved pieces. Check `GET /ai/status`. |
| `db:check` shows `pgvector: NOT installed` | Run `CREATE EXTENSION vector;` (Supabase: Database → Extensions → `vector`). |

---

## License

Personal portfolio project. Feel free to read, learn from and adapt it.
