const assert = require("node:assert/strict");
const test = require("node:test");

process.env.JWT_SECRET = "test-jwt-secret";
process.env.OTP_HMAC_SECRET = "test-otp-secret";

const { db } = require("../dist/plugins/db");
const state = { otps: [], users: [], sessions: [], nextOtpId: 1, nextUserId: 1, nextSessionId: 1 };
const reset = () => Object.assign(state, { otps: [], users: [], sessions: [], nextOtpId: 1, nextUserId: 1, nextSessionId: 1 });
const activeOtp = (email) => state.otps.filter((otp) => otp.email === email && !otp.verified_at && !otp.invalidated_at).sort((a, b) => b.created_at - a.created_at)[0];

const query = async (sql, params = []) => {
  if (/BEGIN|COMMIT|ROLLBACK|pg_advisory/.test(sql)) return { rows: [] };
  if (sql.includes("SELECT created_at FROM auth_otps")) {
    const otp = state.otps.filter((row) => row.email === params[0]).sort((a, b) => b.created_at - a.created_at)[0];
    return { rows: otp ? [{ created_at: otp.created_at }] : [] };
  }
  if (sql.includes("COUNT(*)::int AS count FROM auth_otps")) {
    const field = sql.includes("request_ip") ? "request_ip" : "email";
    return { rows: [{ count: state.otps.filter((row) => row[field] === params[0] && row.created_at > Date.now() - 900000).length }] };
  }
  if (sql.includes("UPDATE auth_otps SET invalidated_at = NOW() WHERE email")) {
    state.otps.forEach((row) => { if (row.email === params[0] && !row.verified_at && !row.invalidated_at) row.invalidated_at = new Date(); });
    return { rows: [] };
  }
  if (sql.includes("INSERT INTO auth_otps")) {
    const otp = { id: state.nextOtpId++, email: params[0], otp_hash: params[1], expires_at: new Date(params[2]), request_ip: params[3], attempts: 0, verified_at: null, invalidated_at: null, created_at: Date.now() };
    state.otps.push(otp); return { rows: [{ id: otp.id }] };
  }
  if (sql.includes("DELETE FROM auth_otps")) { state.otps = state.otps.filter((row) => row.id !== params[0]); return { rows: [] }; }
  if (sql.includes("FROM auth_otps") && sql.includes("FOR UPDATE")) { const otp = activeOtp(params[0]); return { rows: otp ? [otp] : [] }; }
  if (sql.includes("UPDATE auth_otps SET attempts")) {
    const otp = state.otps.find((row) => row.id === params[0]); otp.attempts = params[1]; if (params[1] >= params[2]) otp.invalidated_at = new Date(); return { rows: [] };
  }
  if (sql.includes("UPDATE auth_otps SET verified_at")) { const otp = state.otps.find((row) => row.id === params[0]); otp.verified_at = new Date(); otp.invalidated_at = new Date(); return { rows: [] }; }
  if (sql.includes("UPDATE auth_otps SET invalidated_at")) { const otp = state.otps.find((row) => row.id === params[0]); if (otp) otp.invalidated_at = new Date(); return { rows: [] }; }
  if (sql.startsWith("SELECT * FROM users WHERE email")) return { rows: state.users.filter((user) => user.email === params[0]).slice(0, 1) };
  if (sql.includes("INSERT INTO users")) { const user = { id: state.nextUserId++, email: params[0], password: params[1], niche: null, tone: null, platform: null, created_at: new Date().toISOString() }; state.users.push(user); return { rows: [user] }; }
  if (sql.includes("INSERT INTO auth_refresh_sessions")) { state.sessions.push({ id: state.nextSessionId++, user_id: params[0], token_hash: params[1], expires_at: new Date(params[2]), revoked_at: null }); return { rows: [] }; }
  if (sql.includes("FROM auth_refresh_sessions s JOIN users")) { const session = state.sessions.find((row) => row.token_hash === params[0] && !row.revoked_at && row.expires_at > new Date()); const user = session && state.users.find((row) => row.id === session.user_id); return { rows: session && user ? [{ ...session, user_id: user.id, email: user.email, password: user.password, niche: user.niche, tone: user.tone, platform: user.platform, created_at: user.created_at }] : [] }; }
  if (sql.includes("UPDATE auth_refresh_sessions SET revoked_at")) { state.sessions.forEach((row) => { if ((row.id === params[0] || row.token_hash === params[0]) && !row.revoked_at) row.revoked_at = new Date(); }); return { rows: [] }; }
  throw new Error(`Unhandled test query: ${sql}`);
};
db.query = query;
db.connect = async () => ({ query, release() {} });

const emailService = require("../dist/services/emailService");
const otp = require("../dist/services/otpService");
const { buildApp } = require("../dist/app");
const app = { jwt: { sign: (payload) => `access-${payload.id}` } };
const sendAndCapture = async (email, ip = "127.0.0.1") => { let code; await otp.requestOtp({ email, ip, sendEmail: async ({ code: value }) => { code = value; } }); return code; };

test("OTP service: send, new-user verification, reuse prevention, and session rotation", async () => {
  reset();
  const code = await sendAndCapture("new@example.com");
  assert.match(code, /^\d{6}$/);
  const user = await otp.verifyOtp({ email: "new@example.com", code });
  assert.equal(user.email, "new@example.com");
  await assert.rejects(() => otp.verifyOtp({ email: "new@example.com", code }), { statusCode: 401 });
  const session = await otp.createSession(app, user);
  assert.equal(session.accessToken, `access-${user.id}`);
  const rotated = await otp.rotateSession(app, session.refreshToken);
  assert.notEqual(rotated.refreshToken, session.refreshToken);
  await otp.revokeSession(rotated.refreshToken);
  await assert.rejects(() => otp.rotateSession(app, rotated.refreshToken), { statusCode: 401 });
});

test("OTP service: incorrect codes lock after five attempts and expired codes fail", async () => {
  reset();
  const code = await sendAndCapture("attempts@example.com");
  for (let index = 0; index < 4; index += 1) await assert.rejects(() => otp.verifyOtp({ email: "attempts@example.com", code: "000000" }), { statusCode: 401 });
  await assert.rejects(() => otp.verifyOtp({ email: "attempts@example.com", code: "000000" }), /Too many incorrect attempts/);
  assert.equal(state.otps[0].attempts, 5);
  assert.ok(state.otps[0].invalidated_at);
  state.otps[0].created_at -= 61000;
  const expired = await sendAndCapture("expired@example.com");
  activeOtp("expired@example.com").expires_at = new Date(Date.now() - 1);
  await assert.rejects(() => otp.verifyOtp({ email: "expired@example.com", code: expired }), { statusCode: 401 });
});

test("OTP service: cooldown, prior-code invalidation, existing users, delivery failure, and request limits", async () => {
  reset();
  const first = await sendAndCapture("existing@example.com");
  await assert.rejects(() => sendAndCapture("existing@example.com"), { statusCode: 429 });
  state.otps[0].created_at -= 61000;
  const second = await sendAndCapture("existing@example.com");
  await assert.rejects(() => otp.verifyOtp({ email: "existing@example.com", code: first }), { statusCode: 401 });
  state.users.push({ id: 77, email: "existing@example.com", password: "legacy", niche: null, tone: null, platform: null, created_at: new Date().toISOString() });
  const existing = await otp.verifyOtp({ email: "existing@example.com", code: second });
  assert.equal(existing.id, 77);
  await assert.rejects(() => otp.requestOtp({ email: "failure@example.com", ip: "127.0.0.1", sendEmail: async () => { throw new Error("provider down"); } }), { statusCode: 503 });
  assert.equal(state.otps.some((row) => row.email === "failure@example.com"), false);
  state.otps = Array.from({ length: 5 }, (_, index) => ({ id: index + 100, email: "limited@example.com", request_ip: "10.0.0.1", created_at: Date.now(), verified_at: null, invalidated_at: null }));
  await assert.rejects(() => otp.requestOtp({ email: "limited@example.com", ip: "10.0.0.1", sendEmail: async () => {} }), { statusCode: 429 });
});

test("OTP routes validate input, use mocked delivery, issue JWTs, and preserve protected routes", async () => {
  reset();
  let deliveredCode = "";
  emailService.sendOtpEmail = async ({ code }) => { deliveredCode = code; };
  const appInstance = buildApp();
  await appInstance.ready();
  const invalid = await appInstance.inject({ method: "POST", url: "/auth/otp/send", payload: { email: "invalid" } });
  assert.equal(invalid.statusCode, 400);
  const sent = await appInstance.inject({ method: "POST", url: "/auth/otp/send", payload: { email: "route@example.com" } });
  assert.equal(sent.statusCode, 202);
  assert.match(deliveredCode, /^\d{6}$/);
  const verified = await appInstance.inject({ method: "POST", url: "/auth/otp/verify", payload: { email: "route@example.com", otp: deliveredCode } });
  assert.equal(verified.statusCode, 200);
  assert.equal(typeof verified.json().token, "string");
  const protectedRoute = await appInstance.inject({ method: "GET", url: "/content" });
  assert.equal(protectedRoute.statusCode, 401);
  await appInstance.close();
});
