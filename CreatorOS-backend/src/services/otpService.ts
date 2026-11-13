import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { db } from "../plugins/db";
import { createUser, findUserByEmail, type UserProfile } from "./userService";
import { isOtpEnabled, sendOtpEmail, type OtpEmailSender } from "./emailService";

// The real provider-backed sender, captured at load time. A caller that injects its own
// sender (tests) bypasses the "email provider configured" check below.
const providerSender = sendOtpEmail;

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class OtpError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
  }
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

const secret = () => process.env.OTP_HMAC_SECRET || process.env.JWT_SECRET || "";

const digest = (value: string) => {
  const key = secret();
  if (!key) {
    throw new Error("OTP_HMAC_SECRET or JWT_SECRET must be configured");
  }
  return createHmac("sha256", key).update(value).digest("hex");
};

const codesMatch = (provided: string, expectedHash: string) => {
  const providedHash = digest(provided);
  return timingSafeEqual(Buffer.from(providedHash, "hex"), Buffer.from(expectedHash, "hex"));
};

const generateCode = () => randomInt(0, 1_000_000).toString().padStart(6, "0");

export const requestOtp = async ({
  email,
  ip,
  sendEmail = sendOtpEmail
}: {
  email: string;
  ip: string;
  sendEmail?: OtpEmailSender;
}) => {
  if (sendEmail === providerSender && !isOtpEnabled()) {
    throw new OtpError("Email sign-in codes are not enabled. Please sign in with your password.", 503);
  }

  const client = await db.connect();
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  let otpId: number | null = null;

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [email]);

    // Run one at a time: a single pg client cannot run queries concurrently (deprecated in pg 9).
    const latest = await client.query("SELECT created_at FROM auth_otps WHERE email = $1 ORDER BY created_at DESC LIMIT 1", [email]);
    const emailWindow = await client.query("SELECT COUNT(*)::int AS count FROM auth_otps WHERE email = $1 AND created_at > NOW() - INTERVAL '15 minutes'", [email]);
    const ipWindow = await client.query("SELECT COUNT(*)::int AS count FROM auth_otps WHERE request_ip = $1 AND created_at > NOW() - INTERVAL '15 minutes'", [ip]);
    // Global daily cap keeps a free email-provider quota from being exhausted.
    const dailyWindow = await client.query("SELECT COUNT(*)::int AS count FROM auth_otps WHERE created_at > NOW() - INTERVAL '24 hours'");

    const lastRequestedAt = latest.rows[0]?.created_at ? new Date(latest.rows[0].created_at).getTime() : 0;
    const retryAfterSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - lastRequestedAt)) / 1000);
    if (retryAfterSeconds > 0) {
      throw new OtpError(`Please wait ${retryAfterSeconds} seconds before requesting another code`, 429);
    }
    const dailyLimit = Number(process.env.OTP_DAILY_LIMIT || 90);
    if ((dailyWindow.rows[0]?.count ?? 0) >= dailyLimit) {
      throw new OtpError("Email codes are unavailable right now. Please sign in with your password.", 429);
    }
    if (emailWindow.rows[0].count >= 5 || ipWindow.rows[0].count >= 20) {
      throw new OtpError("Too many verification requests. Please try again later.", 429);
    }

    await client.query(
      "UPDATE auth_otps SET invalidated_at = NOW() WHERE email = $1 AND verified_at IS NULL AND invalidated_at IS NULL",
      [email]
    );
    const inserted = await client.query(
      `INSERT INTO auth_otps (email, otp_hash, expires_at, request_ip)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [email, digest(code), expiresAt, ip]
    );
    otpId = inserted.rows[0].id;
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  try {
    await sendEmail({ to: email, code });
  } catch (error) {
    await db.query("DELETE FROM auth_otps WHERE id = $1", [otpId]);
    throw new OtpError("Unable to send a verification code. Please try again.", 503);
  }

  return { expiresAt };
};

export const verifyOtp = async ({ email, code }: { email: string; code: string }): Promise<UserProfile> => {
  const client = await db.connect();
  let transactionComplete = false;
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT id, otp_hash, expires_at, attempts
       FROM auth_otps
       WHERE email = $1 AND verified_at IS NULL AND invalidated_at IS NULL
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [email]
    );
    const otp = result.rows[0];
    if (!otp || new Date(otp.expires_at).getTime() <= Date.now()) {
      if (otp) await client.query("UPDATE auth_otps SET invalidated_at = NOW() WHERE id = $1", [otp.id]);
      await client.query("COMMIT");
      transactionComplete = true;
      throw new OtpError("This verification code is invalid or expired.", 401);
    }

    if (!codesMatch(code, otp.otp_hash)) {
      const attempts = otp.attempts + 1;
      await client.query(
        "UPDATE auth_otps SET attempts = $2, invalidated_at = CASE WHEN $2 >= $3 THEN NOW() ELSE NULL END WHERE id = $1",
        [otp.id, attempts, MAX_OTP_ATTEMPTS]
      );
      await client.query("COMMIT");
      transactionComplete = true;
      throw new OtpError(attempts >= MAX_OTP_ATTEMPTS ? "Too many incorrect attempts. Request a new code." : "This verification code is invalid or expired.", 401);
    }

    await client.query("UPDATE auth_otps SET verified_at = NOW(), invalidated_at = NOW() WHERE id = $1", [otp.id]);
    await client.query("COMMIT");
    transactionComplete = true;
  } catch (error) {
    if (!transactionComplete) await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) return existingUser;

  try {
    return await createUser(email);
  } catch (error: any) {
    if (error?.code === "23505") {
      const user = await findUserByEmail(email);
      if (user) return user;
    }
    throw error;
  }
};

export const createSession = async (app: FastifyInstance, user: UserProfile) => {
  const accessToken = app.jwt.sign({ id: user.id, email: user.email }, { expiresIn: (process.env.ACCESS_TOKEN_TTL || "15m") as string });
  const refreshToken = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await db.query(
    "INSERT INTO auth_refresh_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [user.id, digest(refreshToken), expiresAt]
  );
  return { accessToken, refreshToken, expiresAt };
};

export const rotateSession = async (app: FastifyInstance, refreshToken: string) => {
  const client = await db.connect();
  let committed = false;
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT s.id, u.id AS user_id, u.email, u.password, u.niche, u.tone, u.platform, u.created_at
       FROM auth_refresh_sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW() FOR UPDATE`,
      [digest(refreshToken)]
    );
    const session = result.rows[0];
    if (!session) throw new OtpError("Session expired. Please sign in again.", 401);
    await client.query("UPDATE auth_refresh_sessions SET revoked_at = NOW() WHERE id = $1", [session.id]);
    await client.query("COMMIT");
    committed = true;
    // NOTE: session.id is the refresh-session row id. The user's id is session.user_id.
    // Using the wrong one here would mint tokens for a different user.
    return createSession(app, { ...session, id: session.user_id } as UserProfile);
  } catch (error) {
    if (!committed) await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const revokeSession = async (refreshToken: string) => {
  await db.query("UPDATE auth_refresh_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL", [digest(refreshToken)]);
};
