# CreatorOS — AI Content Operating System

CreatorOS is an AI-powered content operating system built for creators, influencers, and modern personal brands. It helps turn ideas into high-quality content, score and improve drafts with AI, organize them in a content library, schedule posts through a calendar workflow, and personalize generation based on each creator's niche, tone, and platform.

## ✨ Overview

CreatorOS solves a real creator workflow problem: content creation is usually fragmented across notes apps, AI tools, planning boards, and publishing calendars. CreatorOS brings those workflows into one system so creators can generate, refine, manage, search, and schedule content from a single product.

## 🚀 Features

### 🧠 AI System

- Multi-provider AI generation using Groq, OpenRouter, and Together
- LLM-based content scoring with structured quality analysis
- Improve flow that rewrites existing content using AI feedback
- Personalized generation based on creator niche, tone, and platform
- Strict JSON output validation with retry handling for reliability

### 📚 Content Management

- Content library with saved AI generations
- Favorites system for stronger ideas
- Separate regenerate vs improve behavior
- Draft-first generation flow with manual save
- Full content detail view for script, hooks, and captions

### 📅 Scheduling

- Calendar-based content planning
- Schedule content from the library
- Schedule directly from the calendar view
- Month and week planning views

### 👤 User System

- JWT authentication
- User registration and login
- Protected backend routes
- Profile page for creator preferences
- Stored user profile fields: niche, tone, platform

### 🔍 Smart Search (Vector DB)

- Semantic search using pgvector
- OpenAI embeddings for content indexing
- Similar content discovery based on meaning, not just keywords

## 🏗️ Architecture

The core workflow is:

`AI -> Generate -> Evaluate -> Store -> Embed -> Search -> Schedule`

In practice, CreatorOS:

1. Generates content using a multi-provider AI pipeline
2. Evaluates output quality using LLM-based scoring
3. Stores content in PostgreSQL
4. Creates vector embeddings for semantic retrieval
5. Surfaces content in the library and calendar systems
6. Personalizes future generation using stored creator preferences

## 📁 Project Structure

```text
CreatorOS/
├── CreatorOS-backend/
├── CreatorOS-frontend/
```

## ⚙️ Setup Instructions

### Backend

```bash
cd CreatorOS-backend
npm install
npm run dev
```

### Frontend

```bash
cd CreatorOS-frontend
npm install
npm run dev
```

## 🗄️ Database Setup

- PostgreSQL is required
- Run `db/schema.sql`
- Enable pgvector before using semantic search:

```sql
CREATE EXTENSION vector;
```

## 🔐 Environment Variables

Example backend environment configuration:

```env
OPENAI_API_KEY=
DATABASE_URL=
JWT_SECRET=
```

Depending on your AI providers, you may also use:

```env
GROQ_API_KEY=
OPENROUTER_API_KEY=
TOGETHER_API_KEY=
PORT=
```

## 🧰 Tech Stack

### Frontend

- React
- TypeScript
- Tailwind CSS
- Glassmorphism dark UI system

### Backend

- Fastify
- TypeScript
- PostgreSQL
- pgvector

### AI

- Groq
- OpenRouter
- Together
- OpenAI embeddings

## ✅ Current Status

### Phase 1 Complete

- AI generation system
- AI scoring and improvement flow
- Content library and management
- Calendar scheduling system
- User authentication and profile preferences
- Vector database integration for semantic search

## 🛣️ Future Roadmap

- AI memory system
- Performance analytics
- Auto scheduling
- Content recommendations

---

CreatorOS is evolving into a full AI-powered content intelligence system.
