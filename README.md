# CreatorOS

**CreatorOS** is a full-stack, AI-powered content operating system for creators, personal brands, and modern media teams.

It brings the entire content lifecycle into one product:
**generate**, **evaluate**, **store**, **schedule**, **measure**, and **improve**.

Instead of treating AI content generation as a one-off prompt, CreatorOS is designed as a **closed-loop system** that learns from historical content, performance signals, and user preferences to produce better outputs over time.

## ✨ What Makes CreatorOS Unique

- **Closed-loop content system**
  - CreatorOS does not stop at generation. It captures output, stores memory, tracks performance, and feeds those signals back into future creation.
- **AI + data-driven improvement**
  - Content is generated, scored, improved, and enriched with retrieval context from past work.
- **Memory-aware generation**
  - Semantic retrieval helps the system generate content that is more personalized and more consistent with the creator's history.
- **Versioned content workflow**
  - Library items support regenerate and improve flows, grouped variations, and structured draft management.
- **Full lifecycle product**
  - CreatorOS covers ideation, drafting, evaluation, planning, measurement, and learning in one stack.

## 🔥 Key Features

### 🤖 AI System

- **Multi-provider generation** with **Groq**, **OpenRouter**, and **Together**
- **Provider retry and fallback pipeline** for more reliable output generation
- **Structured JSON responses** with:
  - `script`
  - `hooks`
  - `captions`
  - `threads`
  - `score`
  - `analysis`
- **Strict schema validation** and response normalization
- **LLM-as-a-judge scoring flow** for content quality evaluation
- **Improve flow** that rewrites existing drafts using AI feedback

### 📚 Content System

- **Content library** for saved drafts and AI-generated outputs
- **Regenerate** flow for new takes on the same idea
- **Improve** flow for revising an existing draft in place
- **Version grouping** for related content variations
- **Expandable variations UI** in the library
- **Deep-linkable content detail view** from the library
- **Favorites workflow** for saving standout drafts
- **Generate Like This** flow powered by retrieval context from past content

### 🧠 RAG + Memory

- **Semantic search** using **pgvector**
- **OpenAI embeddings** for content and memory indexing
- **Retrieval-Augmented Generation (RAG)** for context-aware generation
- **Memory store** for scripts, hooks, and captions
- **Personalized generation context** using:
  - past creator outputs
  - user niche
  - preferred tone
  - preferred platform
- **Similarity-based retrieval** weighted by historical content performance

### 📅 Scheduling System

- **Calendar-based planning** for content scheduling
- **Schedule directly from the library**
- **Schedule from the calendar workflow**
- **Uploaded content view** for already scheduled or posted content
- **Published state tracking** through the performance pipeline

### 📈 Performance System

- **Manual performance input** for:
  - views
  - likes
  - comments
  - shares
- **Engagement score calculation**
- **Performance feedback loop** into the memory layer
- **Top-performing content retrieval** for stronger future inspiration

### 👤 User System

- **JWT authentication**
- **Register / login flow**
- **Protected API routes**
- **Profile preferences** for:
  - niche
  - tone
  - platform

## 🧠 System Design / Flow

CreatorOS is built as a **closed-loop AI content engine**:

`Generate → Store → Embed → Search → Schedule → Publish → Measure → Learn → Improve`

### Flow Breakdown

1. **Generate**
   - Multi-provider LLM generation produces structured content output.
2. **Store**
   - Drafts are saved to PostgreSQL with script, hooks, captions, score, and analysis.
3. **Embed**
   - Content and memory artifacts are converted into embeddings.
4. **Search**
   - pgvector enables semantic retrieval across prior scripts, hooks, and captions.
5. **Schedule**
   - Content moves into the calendar planning layer.
6. **Publish**
   - Scheduled items can be marked as published.
7. **Measure**
   - Performance data is added manually through the uploaded content workflow.
8. **Learn**
   - Engagement signals update memory scoring and influence retrieval ranking.
9. **Improve**
   - The system uses stored context and prior results to generate stronger future drafts.

This architecture makes CreatorOS more than a generation tool. It behaves like a **learning content system** that gets more useful as more content and performance data are added.

## 🏗️ Architecture

### Frontend

- **React**
- **TypeScript**
- **Tailwind CSS**
- **react-router-dom**
- Library, calendar, uploaded content, dashboard, onboarding, and profile flows

### Backend

- **Fastify**
- **TypeScript**
- **PostgreSQL**
- **pgvector**
- JWT-protected REST API

### AI Layer

- **Groq**
- **OpenRouter**
- **Together**
- **OpenAI embeddings**
- Structured validation with retry/fallback orchestration

### Core Backend Modules

- **AI routes**
  - generate
  - improve
  - generate-like
- **Content routes**
  - save
  - list
  - delete
  - semantic search
  - uploaded content
  - top-performing content
- **Calendar routes**
  - scheduling
  - calendar retrieval
- **Performance routes**
  - mark published
  - add metrics
- **Memory routes**
  - semantic memory retrieval
- **User routes**
  - profile read/update

## 📁 Project Structure

```text
CreatorOS/
├── CreatorOS-backend/
│   ├── db/
│   │   └── schema.sql
│   └── src/
│       ├── plugins/
│       ├── routes/
│       ├── services/
│       │   └── ai/
│       ├── types/
│       └── utils/
├── CreatorOS-frontend/
│   └── src/
│       ├── components/
│       ├── layouts/
│       ├── pages/
│       ├── store/
│       └── utils/
└── README.md
```

## ⚙️ Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd CreatorOS
```

### 2. Set up PostgreSQL

- Create a PostgreSQL database
- Enable the `vector` extension
- Run the schema file

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

```bash
psql "$DATABASE_URL" -f CreatorOS-backend/db/schema.sql
```

### 3. Install backend dependencies

```bash
cd CreatorOS-backend
npm install
```

### 4. Install frontend dependencies

```bash
cd ../CreatorOS-frontend
npm install
```

### 5. Run the backend

```bash
cd ../CreatorOS-backend
npm run dev
```

### 6. Run the frontend

```bash
cd ../CreatorOS-frontend
npm run dev
```

## 🔐 Environment Variables

Create a `.env` file in `CreatorOS-backend/`:

```env
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/creatoros
JWT_SECRET=your_jwt_secret

GROQ_API_KEY=your_groq_key
OPENROUTER_API_KEY=your_openrouter_key
TOGETHER_API_KEY=your_together_key
OPENAI_API_KEY=your_openai_key
```

### Variable Reference

- **PORT**
  - Backend server port
- **DATABASE_URL**
  - PostgreSQL connection string
- **JWT_SECRET**
  - Secret used to sign auth tokens
- **GROQ_API_KEY**
  - Groq generation provider
- **OPENROUTER_API_KEY**
  - OpenRouter generation provider
- **TOGETHER_API_KEY**
  - Together generation provider
- **OPENAI_API_KEY**
  - Used for embedding generation

## 🧰 Tech Stack

### Frontend

- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Vite**
- **react-router-dom**

### Backend

- **Fastify**
- **TypeScript**
- **PostgreSQL**
- **pgvector**

### AI / ML

- **Groq**
- **OpenRouter**
- **Together**
- **OpenAI embeddings**

## ✅ Current Status

CreatorOS is currently implemented as a working full-stack application with:

- **Authentication and user profile preferences**
- **AI content generation with provider fallback**
- **Structured scoring and improvement workflows**
- **Content library with saved drafts and grouped variations**
- **Memory storage with embeddings and semantic retrieval**
- **Calendar scheduling**
- **Uploaded content and performance input**
- **Feedback loop into memory ranking**

### Current Product State

- **Frontend application:** active
- **Backend API:** active
- **Database schema:** active
- **Semantic memory layer:** active
- **Closed-loop feedback foundation:** active

## 🚀 Roadmap

- **Automated publishing integrations**
  - Push scheduled content directly to platform APIs
- **Performance auto-sync**
  - Import metrics automatically instead of relying on manual input
- **Stronger recommendation engine**
  - Suggest best next content ideas from historical performance
- **Advanced experimentation**
  - Compare variations and rank content strategies more deeply
- **Team workflows**
  - Multi-user collaboration, approval flows, and workspace support
- **Analytics layer**
  - Creator dashboards for retention, hook quality, and content velocity

## 📌 Positioning

CreatorOS is not just an AI writing tool.

It is a **content operating system** built around the idea that the best creator products should:

- **generate faster**
- **learn from history**
- **improve with feedback**
- **support planning and execution**
- **turn content creation into a repeatable system**

If you are building for the future of creator software, media workflows, or AI-native operating systems, CreatorOS is the kind of architecture that matters.
