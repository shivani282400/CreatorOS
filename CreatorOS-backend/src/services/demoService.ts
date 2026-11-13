import bcrypt from "bcrypt";
import { db } from "../plugins/db";
import { getDemoCredentials } from "../config";

type DemoPiece = {
  topic: string;
  platform: string;
  daysAgo: number;
  score: number;
  hooks: string[];
  captions: string[];
  threads: string[];
  script: string;
  analysis: Record<string, unknown>;
  // Performance of the published post, if any.
  performance?: { views: number; likes: number; comments: number; shares: number };
};

const breakdown = (score: number, summary: string, improvements: string[]) => {
  const hook = Math.round(score * 0.3);
  const emotion = Math.round(score * 0.2);
  const engagement = Math.round(score * 0.25);
  const structure = Math.round(score * 0.15);
  return {
    hook_strength: hook,
    emotional_intensity: emotion,
    engagement,
    structure,
    platform_fit: Math.max(0, score - hook - emotion - engagement - structure),
    summary,
    improvements
  };
};

const DEMO_PIECES: DemoPiece[] = [
  {
    topic: "3 AI tools that save me 10 hours a week",
    platform: "Instagram",
    daysAgo: 49,
    score: 78,
    hooks: ["I stopped doing these 3 tasks manually.", "10 hours back every single week."],
    captions: ["Work smarter, not longer. Save this for Monday."],
    threads: ["1/ Three tools quietly saving me a full workday every week."],
    script: "Open with the 10 hours promise. Show tool one with a before and after. Tool two in a single screen recording. End with a call to save the post.",
    analysis: breakdown(78, "Strong promise in the hook, clear structure.", ["Add a number-based proof point in the first three seconds."]),
    performance: { views: 8200, likes: 610, comments: 44, shares: 91 }
  },
  {
    topic: "Why your first 100 followers are the hardest",
    platform: "LinkedIn",
    daysAgo: 42,
    score: 71,
    hooks: ["Nobody tells you the first 100 followers feel impossible.", "Here is what actually moved my first 100."],
    captions: ["The early grind is the part nobody posts about."],
    threads: ["1/ My first 100 followers took 11 weeks. Here is what I would do differently."],
    script: "Personal story opener, three lessons, one honest takeaway, question to the audience.",
    analysis: breakdown(71, "Relatable story, but the middle lacks specifics.", ["Add one concrete example per lesson."]),
    performance: { views: 3100, likes: 180, comments: 37, shares: 22 }
  },
  {
    topic: "Build a RAG chatbot in 60 seconds",
    platform: "YouTube",
    daysAgo: 35,
    score: 84,
    hooks: ["Most RAG tutorials are 40 minutes. This one is 60 seconds.", "Your chatbot is hallucinating because of this one step."],
    captions: ["RAG explained without the jargon. Code in the description."],
    threads: ["1/ RAG in plain English: retrieve first, then generate."],
    script: "Hook with the 60 second claim. Diagram: question, embed, search, generate. Live demo. Common mistake: skipping chunking. Close with the repo link.",
    analysis: breakdown(84, "Excellent curiosity gap and a visual structure.", ["Show the final answer on screen earlier."]),
    performance: { views: 15400, likes: 1320, comments: 156, shares: 240 }
  },
  {
    topic: "My honest take on learning to code with AI",
    platform: "LinkedIn",
    daysAgo: 28,
    score: 66,
    hooks: ["AI will not replace you. Not learning will.", "I learned more in 3 months with AI than in a year without it."],
    captions: ["Use AI as a tutor, not a crutch."],
    threads: ["1/ How I use AI to learn faster without turning my brain off."],
    script: "Contrarian opener, a short story, three rules for using AI while learning, closing question.",
    analysis: breakdown(66, "Opinionated and clear, but the hook is generic.", ["Make the first line more specific to your own experience."]),
    performance: { views: 4200, likes: 260, comments: 61, shares: 35 }
  },
  {
    topic: "Day in my life as a CS student building products",
    platform: "Instagram",
    daysAgo: 21,
    score: 74,
    hooks: ["6 AM. Laptop open. Shipping before college.", "What a CS student who ships actually does all day."],
    captions: ["Build in public, one commit at a time."],
    threads: ["1/ A normal day: classes, code, and one small thing shipped."],
    script: "Fast montage opener, three timed segments, one lesson, soft call to follow.",
    analysis: breakdown(74, "Good pacing and authenticity.", ["Add on-screen captions for silent viewers."]),
    performance: { views: 9800, likes: 840, comments: 72, shares: 118 }
  },
  {
    topic: "5 prompts that make ChatGPT write like you",
    platform: "YouTube",
    daysAgo: 14,
    score: 81,
    hooks: ["Stop getting generic AI writing. Use these 5 prompts.", "Teach AI your voice in under 2 minutes."],
    captions: ["Copy these prompts and make AI sound like you."],
    threads: ["1/ The 5 prompts I use to keep my voice in AI-assisted writing."],
    script: "Problem: generic output. Prompt one to five with a quick example each. Result comparison. Save-for-later call to action.",
    analysis: breakdown(81, "Highly practical and saveable.", ["Open with the best before and after example."]),
    performance: { views: 12100, likes: 1010, comments: 98, shares: 188 }
  },
  {
    topic: "What I learned shipping my first full-stack app",
    platform: "LinkedIn",
    daysAgo: 6,
    score: 76,
    hooks: ["I shipped my first full-stack app. Here are 4 mistakes.", "The bug that taught me more than any course."],
    captions: ["Shipping beats perfecting. Every time."],
    threads: ["1/ Four mistakes from shipping my first full-stack product."],
    script: "Story of the launch, four mistakes with a fix each, closing lesson and invitation to share your own.",
    analysis: breakdown(76, "Credible and useful, strong lessons structure.", ["Include one screenshot or metric."])
  },
  {
    topic: "Why vector search beats keyword search",
    platform: "YouTube",
    daysAgo: 2,
    score: 82,
    hooks: ["Search for 'cheap laptop' and find 'budget notebook'. Here is how.", "Keyword search is blind to meaning. Vector search is not."],
    captions: ["Embeddings turn meaning into math."],
    threads: ["1/ Why vector search finds what keyword search misses."],
    script: "Relatable search example, embeddings in one diagram, cosine similarity in 20 seconds, when to still use keywords, summary.",
    analysis: breakdown(82, "Clear analogy and a strong explanatory arc.", ["Add a live demo clip."])
  }
];

/**
 * Creates (or refreshes) the shared demo account configured with DEMO_EMAIL / DEMO_PASSWORD
 * and, if it has no content yet, fills it with sample data so the dashboard is not empty.
 * Direct SQL only: it never calls an AI or embedding provider.
 */
export const ensureDemoAccount = async () => {
  const demo = getDemoCredentials();
  if (!demo) return;

  const existing = await db.query(
    "SELECT id, password FROM users WHERE LOWER(email) = LOWER($1) ORDER BY id LIMIT 1",
    [demo.email]
  );

  let userId: number;

  if (existing.rows[0]) {
    userId = existing.rows[0].id;
    const current = existing.rows[0].password as string | null;
    const stillMatches = current ? await bcrypt.compare(demo.password, current) : false;
    if (!stillMatches) {
      await db.query("UPDATE users SET password = $2 WHERE id = $1", [userId, await bcrypt.hash(demo.password, 12)]);
    }
  } else {
    const created = await db.query(
      `INSERT INTO users (email, password, niche, tone, platform)
       VALUES ($1, $2, 'Tech & AI', 'Educational', 'YouTube') RETURNING id`,
      [demo.email, await bcrypt.hash(demo.password, 12)]
    );
    userId = created.rows[0].id;
  }

  if (process.env.DEMO_SEED_CONTENT === "false") return;

  const count = await db.query("SELECT COUNT(*)::int AS count FROM content WHERE user_id = $1", [userId]);
  if (count.rows[0].count > 0) return;

  for (const piece of DEMO_PIECES) {
    const inserted = await db.query(
      `INSERT INTO content (user_id, topic, platform, script, hooks, captions, threads, score, analysis, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW() - ($10 || ' days')::interval)
       RETURNING id`,
      [
        userId,
        piece.topic,
        piece.platform,
        piece.script,
        piece.hooks,
        piece.captions,
        piece.threads,
        piece.score,
        JSON.stringify(piece.analysis),
        String(piece.daysAgo)
      ]
    );

    const contentId = inserted.rows[0].id;
    const publishedDaysAgo = Math.max(piece.daysAgo - 1, 0);

    if (piece.performance) {
      await db.query(
        `INSERT INTO calendar (content_id, scheduled_date, published_at, views, likes, comments, shares, status)
         VALUES ($1, (CURRENT_DATE - ($2 || ' days')::interval)::date, NOW() - ($2 || ' days')::interval, $3,$4,$5,$6,'analyzed')`,
        [contentId, String(publishedDaysAgo), piece.performance.views, piece.performance.likes, piece.performance.comments, piece.performance.shares]
      );
    } else if (piece.daysAgo <= 6) {
      await db.query(
        `INSERT INTO calendar (content_id, scheduled_date, status)
         VALUES ($1, (CURRENT_DATE + ($2 || ' days')::interval)::date, 'scheduled')`,
        [contentId, String(piece.daysAgo <= 2 ? 1 : 3)]
      );
    }
  }

  // A ready-made memory summary so the dashboard's "AI memory" and Content DNA panels are filled.
  // Written by hand (no embedding) so seeding never needs an AI provider.
  await db.query("DELETE FROM memory_embeddings WHERE user_id = $1 AND type = 'summary'", [userId]);
  await db.query(
    `INSERT INTO memory_embeddings (user_id, content_id, type, text, score, metadata, style)
     VALUES ($1, NULL, 'summary', $2, $3, $4, $5)`,
    [
      userId,
      "Writing style: clear, practical and beginner-friendly, explaining technical ideas (RAG, vector search, AI tools) with one concrete example. " +
        "Hook patterns: a bold time or number promise in the first line (\"in 60 seconds\", \"10 hours a week\") or a curiosity gap that contrasts a common mistake with the fix. " +
        "Tone: educational with a personal, build-in-public voice. " +
        "Structure: short list of steps, a single demo or example, then a clear call to save or follow. " +
        "What performs well: YouTube explainers with a visual diagram and LinkedIn stories that end with a specific lesson. Number-led hooks earn the highest engagement.",
      Math.round(DEMO_PIECES.reduce((sum, piece) => sum + piece.score, 0) / DEMO_PIECES.length),
      JSON.stringify({ source_count: DEMO_PIECES.length, generated_at: new Date().toISOString(), seeded: true }),
      JSON.stringify({ hook_type: "curiosity gap", caption_length: "short", tone: "educational", structure: "list" })
    ]
  );

  console.info(`[demo] seeded ${DEMO_PIECES.length} sample pieces for ${demo.email}`);
};
