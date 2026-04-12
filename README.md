# CreatorOS

**AI-native content operating system for creators, personal brands, and media teams.**

CreatorOS turns content creation into a closed-loop workflow:

**Generate. Evaluate. Store. Schedule. Measure. Learn. Improve.**

Instead of treating AI as a one-time prompt tool, CreatorOS is built as a system that gets better over time through memory, retrieval, performance signals, and structured iteration.

---

## Overview

CreatorOS combines AI generation, evaluation, scheduling, semantic memory, and performance feedback into a single full-stack product.

It is designed for teams and creators who want more than isolated outputs. The system supports the full content lifecycle, from first draft to post-performance learning.

### Core Value

- **Generate faster** with multi-provider AI
- **Improve quality** with structured scoring and revision flows
- **Stay organized** with a managed content library
- **Plan distribution** through a scheduling workflow
- **Learn from history** with vector memory and retrieval
- **Close the loop** with performance data feeding future generation

---

## ✨ What Makes CreatorOS Unique

### Closed-Loop AI Workflow

CreatorOS is designed as a feedback system, not a single-purpose generator.

- Content is generated
- Stored as structured data
- Embedded for semantic retrieval
- Scheduled into a planning workflow
- Measured after publishing
- Fed back into memory for better future outputs

### Memory-Aware Generation

The system retrieves relevant scripts, hooks, and captions from historical creator data before generating new content.

- **RAG-powered context injection**
- **Semantic retrieval with pgvector**
- **Preference-aware generation** using niche, tone, and platform

### Versioned Content Operations

CreatorOS supports content as an evolving asset, not a static document.

- Regenerate alternate drafts
- Improve existing content in place
- Group related variations
- Compare versions in the library workflow

### Full Lifecycle Product

CreatorOS covers more than content writing.

- Ideation
- Drafting
- Evaluation
- Storage
- Scheduling
- Measurement
- Learning

---

## 🔥 Key Features

### 🤖 AI System

- **Multi-provider generation**
  - Groq
  - OpenRouter
  - Together
- **Structured JSON output**
  - `script`
  - `hooks`
  - `captions`
  - `threads`
  - `score`
  - `analysis`
- **Strict schema validation**
- **Retry + fallback orchestration**
- **LLM-as-a-judge scoring**
- **AI improvement flow** for upgrading existing drafts

### 📚 Content System

- **Saved draft library**
- **Regenerate vs improve workflows**
- **Version grouping system**
- **Expandable variation views**
- **Favorites workflow**
- **Deep-linkable library detail state**
- **Generate Like This** using past content context

### 🧠 RAG + Memory (Personalization Engine)

- **OpenAI embeddings + pgvector**
- **Retrieval-Augmented Generation (RAG)**
- **Memory storage** for:
  - scripts
  - hooks
  - captions
- **Performance-aware retrieval**
  - combines similarity + engagement score
- **Brand + persona memory**
  - niche, tone, platform, audience
- **Style extraction system**
  - hook type, tone, structure, caption length
- **Memory summarization**
  - compresses top-performing content into high-level insights
- **Auto-learning memory system**
  - updates based on content creation and performance events
- **Content DNA (style insights)**
  - structured representation of creator behavior

### 📅 Scheduling System

- **Calendar-based planning**
- **Schedule from library**
- **Schedule from calendar workflow**
- **Uploaded content view** for scheduled/published items
- **Published status tracking**

### 📈 Performance System

- **Manual performance input**
  - views
  - likes
  - comments
  - shares
- **Engagement score calculation**
- **Feedback loop into memory ranking**
- **Top-performing content retrieval**

### 👤 User System

- **JWT authentication**
- **Protected API routes**
- **Profile preference management**
- **Stored creator profile fields**
  - niche
  - tone
  - platform

---

## 🧠 System Design

### Closed-Loop Flow

```text
Generate → Store → Embed → Retrieve → Personalize → Schedule → Publish → Measure → Learn → Summarize → Improve
```


---

### How It Works

1. **Generate**  
   Multi-provider AI generates structured content  

2. **Store**  
   Content saved in PostgreSQL  

3. **Embed**  
   Converted into vector embeddings  

4. **Retrieve**  
   Semantic search using pgvector  

5. **Personalize**  
   Inject memory + style into prompts  

6. **Schedule**  
   Content moves to calendar  

7. **Publish**  
   Marked as published  

8. **Measure**  
   Performance metrics added  

9. **Learn**  
   Memory updated with scores  

10. **Summarize**  
    AI generates high-level insights  

11. **Improve**  
    Future outputs become better  

---

## 🏗️ Architecture

### Frontend
- React  
- TypeScript  
- Tailwind CSS  
- Vite  

### Backend
- Fastify  
- TypeScript  
- PostgreSQL  
- pgvector  

### AI Layer
- Groq  
- OpenRouter  
- Together  
- OpenAI (embeddings)  

---

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

### Main Frontend Screens

- **Dashboard**
- **Generate**
- **Library**
- **Calendar**
- **Uploaded**
- **Profile**
- **Onboarding**

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd CreatorOS
```

### 2. Configure PostgreSQL

- Create a database
- Enable the `vector` extension
- Run the schema file

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

```bash
psql "$DATABASE_URL" -f CreatorOS-backend/db/schema.sql
```

### 3. Install Backend Dependencies

```bash
cd CreatorOS-backend
npm install
```

### 4. Install Frontend Dependencies

```bash
cd ../CreatorOS-frontend
npm install
```

### 5. Start the Backend

```bash
cd ../CreatorOS-backend
npm run dev
```

### 6. Start the Frontend

```bash
cd ../CreatorOS-frontend
npm run dev
```

---

## 🔐 Environment Variables

Create a `.env` file in `CreatorOS-backend/`.

```env
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/creatoros
JWT_SECRET=your_jwt_secret

GROQ_API_KEY=your_groq_key
OPENROUTER_API_KEY=your_openrouter_key
TOGETHER_API_KEY=your_together_key
OPENAI_API_KEY=your_openai_key
```

### Variables

- **PORT**
  - Backend server port
- **DATABASE_URL**
  - PostgreSQL connection string
- **JWT_SECRET**
  - Secret used for token signing
- **GROQ_API_KEY**
  - Groq provider key
- **OPENROUTER_API_KEY**
  - OpenRouter provider key
- **TOGETHER_API_KEY**
  - Together provider key
- **OPENAI_API_KEY**
  - Embeddings provider key

---

## 🧰 Tech Stack

### Frontend Stack

- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Vite**
- **react-router-dom**

### Backend Stack

- **Fastify**
- **TypeScript**
- **PostgreSQL**
- **pgvector**

### AI / ML Stack

- **Groq**
- **OpenRouter**
- **Together**
- **OpenAI embeddings**

---

## ✅ Current Status

CreatorOS is currently implemented as a working full-stack application with:

- **Authentication and creator profile setup**
- **AI generation with provider fallback**
- **Structured content scoring**
- **Improve and generate-like workflows**
- **Saved draft library**
- **Semantic memory storage and retrieval**
- **Calendar scheduling**
- **Uploaded content tracking**
- **Manual performance input**
- **Feedback loop into memory ranking**

### Product State

- **Frontend application:** active
- **Backend API:** active
- **Database schema:** active
- **Semantic memory layer:** active
- **Closed-loop architecture:** active

---

## 🚀 Roadmap

- **Publishing integrations**
  - Platform-native publishing from CreatorOS
- **Automated performance sync**
  - Pull metrics without manual entry
- **Deeper experimentation workflows**
  - Better comparison and ranking of content variants
- **Recommendation engine**
  - Suggest next best ideas from memory and performance
- **Collaboration features**
  - Team workflows, approvals, and workspace support
- **Richer analytics**
  - Trend reporting, content velocity, and retention insights

---

## Positioning

CreatorOS is not just an AI writer.

It is a **content operating system** built for creators who want a repeatable, learnable, data-informed workflow.

### In Practice, That Means

- **Generate faster**
- **Make better decisions**
- **Keep content organized**
- **Plan publishing**
- **Learn from outcomes**
- **Compound quality over time**

