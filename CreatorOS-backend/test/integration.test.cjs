/**
 * End-to-end tests: real Fastify app + real Postgres (with pgvector) + a mock AI provider.
 *
 *   TEST_DATABASE_URL=postgres://user:pass@localhost:5432/creatoros_test npm test
 *
 * The database name must contain "test" because the tables are emptied before the run.
 */
const assert = require("node:assert/strict");
const { test, before, after } = require("node:test");

const databaseUrl = process.env.TEST_DATABASE_URL;
const skip = databaseUrl ? false : "set TEST_DATABASE_URL to run the integration tests";

let base;
let app;
let mock;
let db;
let ensureDemoAccount;

const call = async (method, path, { token, body, headers = {} } = {}) => {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: response.status, json, text, headers: response.headers };
};

const jwtPayload = (token) => JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
const cookieOf = (response) => (response.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");

const parseSse = (text) =>
  text.split("\n\n").filter((block) => block.startsWith("event:")).map((block) => {
    const [eventLine, dataLine] = block.split("\n");
    return { event: eventLine.slice(7).trim(), data: JSON.parse(dataLine.slice(5)) };
  });

const state = {};

before(async () => {
  if (skip) return;
  assert.match(new URL(databaseUrl).pathname, /test/i, "TEST_DATABASE_URL must point at a database with 'test' in its name");

  mock = await require("./helpers/mockAiServer.cjs").startMockAiServer();

  Object.assign(process.env, {
    DATABASE_URL: databaseUrl,
    DATABASE_SSL: "false",
    NODE_ENV: "test",
    JWT_SECRET: "integration-test-secret-integration-test-secret",
    FRONTEND_URL: "https://app.example.com",
    GROQ_API_KEY: "test-key",
    GROQ_BASE_URL: mock.url,
    OPENROUTER_API_KEY: "test-key",
    OPENROUTER_BASE_URL: `${mock.url}/api/v1`,
    OPENAI_API_KEY: "test-key",
    OPENAI_BASE_URL: `${mock.url}/v1`,
    AI_RATE_LIMIT_MAX: "1000",
    DEMO_EMAIL: "demo@creatoros.test",
    DEMO_PASSWORD: "Demo@12345",
    DEMO_SHOW_ON_LOGIN: "true"
  });
  for (const key of ["GMAIL_USER", "GMAIL_APP_PASSWORD", "SMTP_USER", "SMTP_PASS", "RESEND_API_KEY", "BREVO_API_KEY"]) delete process.env[key];

  const dbModule = require("../dist/plugins/db");
  db = dbModule.db;
  await dbModule.initDatabase();
  await db.query("TRUNCATE users, content, calendar, memory_embeddings, auth_otps, auth_refresh_sessions RESTART IDENTITY");

  ({ ensureDemoAccount } = require("../dist/services/demoService"));
  app = require("../dist/app").buildApp();
  await app.listen({ port: 0, host: "127.0.0.1" });
  base = `http://127.0.0.1:${app.server.address().port}`;
});

after(async () => {
  if (skip) return;
  await app?.close();
  await new Promise((resolve) => mock?.server.close(resolve));
  await db?.end();
});

/* -------------------------------- platform -------------------------------- */

test("health works and the public /test-db endpoint is gone", { skip }, async () => {
  assert.equal((await call("GET", "/health")).status, 200);
  assert.equal((await call("GET", "/health/ready")).json.database, "up");
  assert.equal((await call("GET", "/test-db")).status, 404);
});

test("CORS only reflects the configured frontend origin", { skip }, async () => {
  const allowed = await call("GET", "/health", { headers: { origin: "https://app.example.com" } });
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://app.example.com");
  assert.equal(allowed.headers.get("access-control-allow-credentials"), "true");

  const blocked = await call("GET", "/health", { headers: { origin: "https://evil.example.com" } });
  assert.equal(blocked.headers.get("access-control-allow-origin"), null);
});

test("auth config hides OTP when no email provider is set and exposes the opt-in demo login", { skip }, async () => {
  const { json } = await call("GET", "/auth/config");
  assert.equal(json.otpEnabled, false);
  assert.equal(json.demo.email, "demo@creatoros.test");

  const otp = await call("POST", "/auth/otp/send", { body: { email: "x@example.com" } });
  assert.equal(otp.status, 503);
  assert.match(otp.json.error, /password/i);
});

/* ---------------------------------- auth ---------------------------------- */

test("password register/login are validated, case-insensitive and never leak which emails exist", { skip }, async () => {
  assert.equal((await call("POST", "/auth/register", { body: { email: "nope", password: "longenough1" } })).status, 400);
  assert.equal((await call("POST", "/auth/register", { body: { email: "a@example.com", password: "short" } })).status, 400);

  const a = await call("POST", "/auth/register", { body: { email: "Alice@Example.com", password: "alice-password-1" } });
  assert.equal(a.status, 200);
  assert.equal(a.json.user.email, "alice@example.com");
  state.alice = { id: a.json.user.id, token: a.json.token };

  assert.equal((await call("POST", "/auth/register", { body: { email: "ALICE@example.com", password: "another-pass-1" } })).status, 409);

  // A legacy account that was stored with mixed case must be found, not duplicated.
  const bcrypt = require("bcrypt");
  await db.query("INSERT INTO users (email, password) VALUES ($1, $2)", ["Legacy@Example.com", await bcrypt.hash("legacy-pass", 10)]);
  const legacy = await call("POST", "/auth/login", { body: { email: "legacy@example.com", password: "legacy-pass" } });
  assert.equal(legacy.status, 200);
  assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM users WHERE LOWER(email) = 'legacy@example.com'")).rows[0].n, 1);

  const wrong = await call("POST", "/auth/login", { body: { email: "alice@example.com", password: "wrong-password" } });
  const unknown = await call("POST", "/auth/login", { body: { email: "ghost@example.com", password: "whatever-1" } });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(wrong.json.error, unknown.json.error);

  await db.query("INSERT INTO users (email, password) VALUES ('otp-only@example.com', NULL)");
  const noPassword = await call("POST", "/auth/login", { body: { email: "otp-only@example.com", password: "anything-1" } });
  assert.equal(noPassword.status, 401);
  assert.match(noPassword.json.error, /no password yet/i);

  assert.equal((await call("GET", "/content")).status, 401);
});

test("refreshing a session returns a token for the SAME user (regression: session id vs user id)", { skip }, async () => {
  // Create extra users and sessions so session ids and user ids no longer line up.
  const b = await call("POST", "/auth/register", { body: { email: "bob@example.com", password: "bob-password-1" } });
  state.bob = { id: b.json.user.id, token: b.json.token };
  await call("POST", "/auth/register", { body: { email: "carol@example.com", password: "carol-password-1" } });

  const login = await call("POST", "/auth/login", { body: { email: "alice@example.com", password: "alice-password-1" } });
  const cookie = cookieOf(login);
  assert.match(login.headers.getSetCookie().join(";"), /HttpOnly/i);

  const refreshed = await call("POST", "/auth/refresh", { headers: { cookie } });
  assert.equal(refreshed.status, 200);
  assert.equal(jwtPayload(refreshed.json.token).id, state.alice.id);

  // The old refresh token is single-use.
  assert.equal((await call("POST", "/auth/refresh", { headers: { cookie } })).status, 401);
  state.alice.token = refreshed.json.token;
});

test("changing the password requires the current one", { skip }, async () => {
  const { token } = state.alice;
  assert.equal((await call("POST", "/auth/password", { token, body: { currentPassword: "nope", newPassword: "brand-new-pass-1" } })).status, 401);
  assert.equal((await call("POST", "/auth/password", { token, body: { currentPassword: "alice-password-1", newPassword: "short" } })).status, 400);
  assert.equal((await call("POST", "/auth/password", { token, body: { currentPassword: "alice-password-1", newPassword: "brand-new-pass-1" } })).status, 200);
  assert.equal((await call("POST", "/auth/login", { body: { email: "alice@example.com", password: "brand-new-pass-1" } })).status, 200);
});

/* ----------------------------- AI + RAG pipeline ----------------------------- */

test("AI status reports the configured providers without secrets", { skip }, async () => {
  const { json } = await call("GET", "/ai/status", { token: state.alice.token });
  assert.ok(json.generation.groq.model);
  assert.ok(json.generation.openrouter.model);
  assert.equal(json.embeddings, "openai");
  assert.equal(json.ragEnabled, true);
  assert.ok(!JSON.stringify(json).includes("test-key"));
});

test("generate validates input and returns a validated draft", { skip }, async () => {
  const { token } = state.alice;
  assert.equal((await call("POST", "/ai/generate", { token, body: { topic: "" } })).status, 400);
  assert.equal((await call("POST", "/ai/generate", { body: { topic: "No auth" } })).status, 401);

  const res = await call("POST", "/ai/generate", {
    token,
    body: { topic: "vector databases", platform: "YouTube", niche: "AI", tone: "Educational", goal: "Grow Audience", audience: "students", contentType: "Script", useBrandVoice: true, save: false }
  });
  assert.equal(res.status, 200);
  assert.equal(res.json.success, true);
  assert.ok(res.json.data.script.length > 10);
  assert.ok(res.json.data.hooks.length >= 3);
  assert.equal(res.json.data.score, 79);
  state.draft = res.json.data;
});

test("streaming generation emits status, growing script deltas and a validated final result", { skip }, async () => {
  const response = await fetch(`${base}/ai/generate/stream`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${state.alice.token}`, origin: "https://app.example.com" },
    body: JSON.stringify({ topic: "streaming demo", platform: "Instagram", save: false })
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/event-stream/);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://app.example.com");

  const events = parseSse(await response.text());
  const names = events.map((e) => e.event);
  assert.ok(names.includes("status"));
  assert.equal(names.at(-1), "done");

  const deltas = events.filter((e) => e.event === "delta").map((e) => e.data.text);
  assert.ok(deltas.length >= 2, "script should arrive in several pieces");
  for (let i = 1; i < deltas.length; i += 1) assert.ok(deltas[i].startsWith(deltas[i - 1]) || deltas[i].length >= deltas[i - 1].length);

  const done = events.at(-1).data;
  assert.equal(done.success, true);
  assert.equal(done.data.script, deltas.at(-1), "the last streamed text equals the final script");
  assert.ok(done.data.hooks.length >= 3);

  assert.equal((await call("POST", "/ai/generate/stream", { token: state.alice.token, body: { topic: "" } })).status, 400);
});

test("saving content validates input and writes RAG memory embeddings", { skip }, async () => {
  const { token } = state.alice;
  assert.equal((await call("POST", "/content", { token, body: { platform: "YouTube" } })).status, 400);

  const saved = await call("POST", "/content", {
    token,
    body: { topic: "vector databases", platform: "YouTube", script: state.draft.script, hooks: state.draft.hooks, captions: state.draft.captions, threads: state.draft.threads, score: state.draft.score, analysis: { summary: "ok", improvements: ["x"] } }
  });
  assert.equal(saved.status, 200);
  state.contentId = saved.json.data.id;

  const types = (await db.query("SELECT type, COUNT(*)::int AS n FROM memory_embeddings WHERE user_id = $1 GROUP BY type", [state.alice.id]))
    .rows.reduce((acc, row) => ({ ...acc, [row.type]: row.n }), {});
  assert.equal(types.script, 1);
  assert.equal(types.hook, state.draft.hooks.length);
  assert.equal(types.caption, state.draft.captions.length);

  const stored = await db.query("SELECT vector_dims(embedding) AS dims FROM memory_embeddings WHERE user_id = $1 AND type = 'script'", [state.alice.id]);
  assert.equal(stored.rows[0].dims, 1536);

  const list = await call("GET", "/content", { token });
  assert.equal(list.json.data.length, 1);
  assert.equal((await call("GET", "/content", { token: state.bob.token })).json.data.length, 0, "content is private per user");

  const search = await call("GET", "/content/search?q=vector%20databases", { token });
  assert.equal(search.status, 200);
  assert.equal(search.json.data.length, 1);
});

test("RAG: a later generation retrieves saved memory and puts it in the prompt", { skip }, async () => {
  const before = mock.state.chatRequests.length;
  const res = await call("POST", "/ai/generate", { token: state.alice.token, body: { topic: "vector databases", platform: "YouTube", save: false } });
  assert.equal(res.status, 200);
  assert.ok(res.json.meta.usedMemory > 0, "memory entries should be retrieved");

  const prompt = mock.state.chatRequests[before].prompt;
  assert.match(prompt, /Past Scripts/);
  assert.ok(prompt.includes(state.draft.script.slice(0, 40)), "a saved script is injected into the prompt");
  assert.match(prompt, /Library DNA/);
});

test("providers fall back (Groq -> OpenRouter) and failures never leak provider internals", { skip }, async () => {
  mock.state.failPrefixes = ["/openai/"];
  const viaFallback = await call("POST", "/ai/generate", { token: state.alice.token, body: { topic: "fallback test", save: false } });
  assert.equal(viaFallback.status, 200);
  assert.ok(mock.state.chatRequests.at(-1).url.startsWith("/api/v1/"), "OpenRouter handled the request");

  const streamed = await fetch(`${base}/ai/generate/stream`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${state.alice.token}` },
    body: JSON.stringify({ topic: "stream fallback", save: false })
  });
  const events = parseSse(await streamed.text());
  assert.equal(events.at(-1).event, "done", "stream falls back to the standard path");

  mock.state.failPrefixes = ["/openai/", "/api/v1/"];
  const failed = await call("POST", "/ai/generate", { token: state.alice.token, body: { topic: "everything down", save: false } });
  assert.ok(failed.status >= 500);
  assert.ok(!failed.text.includes("mock provider failure"), "raw provider errors are not exposed");
  assert.ok(failed.json.error.length > 10);

  mock.state.failPrefixes = [];
});

test("a model that rejects JSON mode is retried without it; a retired model gives an actionable message", { skip }, async () => {
  const { token } = state.alice;

  mock.state.rejectJsonMode = true;
  const before = mock.state.chatRequests.length;
  const retried = await call("POST", "/ai/generate", { token, body: { topic: "json mode retry", save: false } });
  assert.equal(retried.status, 200);
  const groqCalls = mock.state.chatRequests.slice(before).filter((r) => r.url.startsWith("/openai/"));
  assert.ok(groqCalls.length >= 2 && !groqCalls.at(-1).body.response_format, "second attempt omits response_format");
  mock.state.rejectJsonMode = false;

  mock.state.failPrefixes = ["/openai/", "/api/v1/"];
  mock.state.failResponse = {
    groq: { status: 400, message: "The model `llama-3.3-70b-versatile` has been decommissioned and is no longer supported." },
    openrouter: { status: 429, message: "Rate limit exceeded: free-models-per-day" }
  };
  const retired = await call("POST", "/ai/generate", { token, body: { topic: "retired model", save: false } });
  assert.equal(retired.status, 503);
  assert.match(retired.json.error, /no longer available/i);
  assert.match(retired.json.error, /GROQ_MODEL/);

  mock.state.failResponse = { groq: { status: 401, message: "Invalid API Key" }, openrouter: { status: 401, message: "No auth credentials found" } };
  const badKey = await call("POST", "/ai/generate", { token, body: { topic: "bad key", save: false } });
  assert.equal(badKey.status, 503);
  assert.match(badKey.json.error, /API key/i);

  mock.state.failPrefixes = [];
  mock.state.failResponse = null;
});

/* ------------------------- calendar, performance, insights ------------------------- */

test("calendar scheduling enforces ownership and performance validates numbers", { skip }, async () => {
  const { token } = state.alice;
  assert.equal((await call("POST", "/calendar/schedule", { token, body: { contentId: state.contentId, date: "not-a-date" } })).status, 400);
  assert.equal((await call("POST", "/calendar/schedule", { token: state.bob.token, body: { contentId: state.contentId, date: "2030-01-10" } })).status, 404, "cannot schedule someone else's content");

  const scheduled = await call("POST", "/calendar/schedule", { token, body: { contentId: state.contentId, date: "2030-01-10" } });
  assert.equal(scheduled.status, 200);
  const calendarId = scheduled.json.data.id;

  assert.equal((await call("GET", "/calendar", { token })).json.data.length, 1);
  assert.equal((await call("GET", "/calendar", { token: state.bob.token })).json.data.length, 0);

  assert.equal((await call("POST", "/performance/add", { token, body: { calendarId, views: -5, likes: 1, comments: 1, shares: 1 } })).status, 400);
  const perf = await call("POST", "/performance/add", { token, body: { calendarId, views: 1000, likes: 100, comments: 10, shares: 20 } });
  assert.equal(perf.status, 200);
  assert.equal(perf.json.data.status, "analyzed");
});

test("insights overview reflects the user's real data", { skip }, async () => {
  const { json, status } = await call("GET", "/insights/overview", { token: state.alice.token });
  assert.equal(status, 200);
  const d = json.data;
  assert.equal(d.totals.content, 1);
  assert.equal(d.weekly.length, 8);
  assert.equal(d.weekly.at(-1).count, 1);
  assert.equal(d.platforms[0].platform, "YouTube");
  assert.equal(d.performance.views, 1000);
  assert.equal(d.performance.engagementRate, 13);
  assert.equal(d.topPosts[0].views, 1000);
  assert.ok(d.topHooks.length >= 1);
  assert.ok(d.summary.length >= 2);

  const empty = (await call("GET", "/insights/overview", { token: state.bob.token })).json.data;
  assert.equal(empty.totals.content, 0);
  assert.match(empty.summary[0], /first piece/i);
});

test("demo account is created, seeded once, and its password cannot be changed", { skip }, async () => {
  await ensureDemoAccount();
  await ensureDemoAccount(); // idempotent

  const login = await call("POST", "/auth/login", { body: { email: "demo@creatoros.test", password: "Demo@12345" } });
  assert.equal(login.status, 200);
  const token = login.json.token;

  const insights = (await call("GET", "/insights/overview", { token })).json.data;
  assert.equal(insights.totals.content, 8, "seeded exactly once");
  assert.ok(insights.performance.views > 0);
  assert.ok(insights.topPosts.length > 0);
  assert.ok(insights.topHooks.length > 0);
  assert.ok(insights.weekly.filter((w) => w.count > 0).length >= 5, "history spans several weeks");

  const memory = (await call("GET", "/memory/summary", { token })).json;
  assert.ok(memory.summary.length > 50, "the demo account has an AI memory summary");
  assert.equal(memory.styleInsights.tone, "educational");

  assert.equal((await call("POST", "/auth/password", { token, body: { currentPassword: "Demo@12345", newPassword: "hijacked-pass-1" } })).status, 403);
});

test("users can only delete their own content", { skip }, async () => {
  assert.equal((await call("DELETE", `/content/${state.contentId}`, { token: state.bob.token })).json.success, false);
  assert.equal((await call("DELETE", `/content/${state.contentId}`, { token: state.alice.token })).json.success, true);
});

test("login is rate limited", { skip }, async () => {
  let limited = false;
  for (let i = 0; i < 15 && !limited; i += 1) {
    limited = (await call("POST", "/auth/login", { body: { email: "alice@example.com", password: "bad-password" } })).status === 429;
  }
  assert.ok(limited, "expected a 429 after repeated failed logins");
});
