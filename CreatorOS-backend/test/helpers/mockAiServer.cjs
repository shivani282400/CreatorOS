/**
 * Tiny stand-in for Groq / OpenRouter / OpenAI so the whole AI + RAG pipeline can be
 * exercised without API keys or network access.
 *
 *   POST /openai/v1/chat/completions  (Groq SDK)   - JSON or SSE stream
 *   POST /api/v1/chat/completions     (OpenRouter) - JSON
 *   POST /v1/embeddings | /api/v1/embeddings       - deterministic 1536-d vectors
 */
const http = require("node:http");
const { createHash } = require("node:crypto");

const embeddingFor = (text) => {
  // Deterministic pseudo-random unit vector derived from the text.
  const seed = createHash("sha256").update(String(text)).digest();
  let state = seed.readUInt32LE(0) || 1;
  const vector = Array.from({ length: 1536 }, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0xffffffff - 0.5;
  });
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map((v) => v / norm);
};

const aiContent = (topic) => ({
  script: `Hook the viewer fast about ${topic}. Explain the idea in three clear steps, show one concrete example, then end with a call to action.`,
  hooks: [`Stop scrolling: ${topic} explained`, `The ${topic} mistake everyone makes`, `${topic} in 30 seconds`],
  captions: [`Everything you need to know about ${topic}.`],
  threads: [`1/ A quick thread on ${topic}.`],
  score: 79,
  analysis: {
    hook_strength: 24,
    emotional_intensity: 15,
    engagement: 20,
    structure: 12,
    platform_fit: 8,
    summary: "Strong hook with a clear three step structure.",
    improvements: ["Add a more specific example in the middle."]
  }
});

const startMockAiServer = () =>
  new Promise((resolve) => {
    const state = { chatRequests: [], embeddingRequests: 0, failPrefixes: [], failResponse: null, rejectJsonMode: false };

    const server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        const body = raw ? JSON.parse(raw) : {};

        if (req.url.endsWith("/embeddings")) {
          state.embeddingRequests += 1;
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ data: [{ embedding: embeddingFor(body.input) }] }));
          return;
        }

        if (req.url.endsWith("/chat/completions")) {
          const prompt = body.messages?.[0]?.content ?? "";
          state.chatRequests.push({ url: req.url, prompt, stream: Boolean(body.stream), body });

          if (state.failPrefixes.some((prefix) => req.url.startsWith(prefix))) {
            const failure = state.failResponse?.[req.url.startsWith("/openai/") ? "groq" : "openrouter"] ?? { status: 500, message: "mock provider failure" };
            res.writeHead(failure.status, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: { message: failure.message } }));
            return;
          }

          if (state.rejectJsonMode && body.response_format) {
            res.writeHead(400, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: { message: "response_format json_object is not supported with this model" } }));
            return;
          }

          const topic = /Topic:\s*(.+)/i.exec(prompt)?.[1]?.trim() || "your topic";
          const content = JSON.stringify(aiContent(topic));

          if (body.stream) {
            res.writeHead(200, { "content-type": "text/event-stream" });
            for (let i = 0; i < content.length; i += 15) {
              const piece = content.slice(i, i + 15);
              res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: piece } }] })}\n\n`);
            }
            res.write("data: [DONE]\n\n");
            res.end();
            return;
          }

          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ id: "mock", object: "chat.completion", choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }] }));
          return;
        }

        res.writeHead(404).end();
      });
    });

    server.listen(0, "127.0.0.1", () => {
      resolve({ server, state, url: `http://127.0.0.1:${server.address().port}` });
    });
  });

module.exports = { startMockAiServer, embeddingFor };
