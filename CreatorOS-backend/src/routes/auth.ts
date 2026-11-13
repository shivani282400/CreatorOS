import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { z } from "zod";
import { createUser, findUserByEmail, getUserById, setUserPassword } from "../services/userService";
import {
  createSession,
  normalizeEmail,
  OtpError,
  requestOtp,
  revokeSession,
  rotateSession,
  verifyOtp
} from "../services/otpService";
import { getEmailProvider, isOtpEnabled } from "../services/emailService";
import { getDemoCredentials, isProduction, isRegistrationEnabled } from "../config";

const emailField = z.string().trim().email().max(320);

const otpRequestSchema = z.object({ email: emailField });
const otpVerifySchema = z.object({
  email: emailField,
  otp: z.string().regex(/^\d{6}$/, "Enter the six-digit verification code")
});

// New passwords must be strong enough; login accepts any non-empty value so
// accounts created with the older, looser rules keep working.
const newPasswordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");

const registerSchema = z.object({ email: emailField, password: newPasswordField });
const loginSchema = z.object({ email: emailField, password: z.string().min(1).max(128) });
const changePasswordSchema = z.object({
  currentPassword: z.string().max(128).optional(),
  newPassword: newPasswordField
});

const REFRESH_COOKIE = "creatoros_refresh";
const BCRYPT_ROUNDS = 12;

// Compared against when a user does not exist so response time does not reveal valid emails.
const DUMMY_HASH = bcrypt.hashSync("creatoros-dummy-password", BCRYPT_ROUNDS);

const cookieOptions = () => {
  // Cross-site frontends (e.g. Vercel -> Render) need SameSite=None; Secure.
  // Same-site setups (Vercel rewrite proxy, local dev) work with Lax.
  const configured = process.env.COOKIE_SAMESITE?.toLowerCase();
  const sameSite =
    configured === "none" || configured === "lax" || configured === "strict"
      ? configured
      : isProduction()
        ? "none"
        : "lax";

  return {
    httpOnly: true,
    secure: isProduction() || sameSite === "none",
    sameSite: sameSite as "none" | "lax" | "strict",
    path: "/"
  };
};

const setRefreshCookie = (reply: any, token: string, expiresAt: Date) => {
  reply.setCookie(REFRESH_COOKIE, token, { ...cookieOptions(), expires: expiresAt });
};

const issueTokens = async (app: FastifyInstance, reply: any, user: any) => {
  const session = await createSession(app, user);
  setRefreshCookie(reply, session.refreshToken, session.expiresAt);
  return {
    user: { id: user.id, email: user.email },
    token: session.accessToken
  };
};

const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? "Invalid request";

export async function authRoutes(app: FastifyInstance) {
  // Tells the frontend which sign-in methods to show.
  app.get("/auth/config", async () => {
    const demo = getDemoCredentials();
    return {
      otpEnabled: isOtpEnabled(),
      emailProvider: getEmailProvider(),
      registrationEnabled: isRegistrationEnabled(),
      // Only exposed when you explicitly opt in, so recruiters can try the app in one click.
      demo: demo && process.env.DEMO_SHOW_ON_LOGIN === "true" ? demo : null
    };
  });

  app.post("/auth/register", {
    config: { rateLimit: { max: 10, timeWindow: "1 hour" } }
  }, async (request, reply) => {
    if (!isRegistrationEnabled()) {
      return reply.code(403).send({ error: "Sign-ups are currently closed" });
    }

    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: firstIssue(parsed.error) });
    }

    const email = normalizeEmail(parsed.data.email);
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return reply.code(409).send({ error: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);

    try {
      const user = await createUser(email, hashedPassword);
      return await issueTokens(app, reply, user);
    } catch (error: any) {
      if (error?.code === "23505") {
        return reply.code(409).send({ error: "An account with this email already exists" });
      }
      throw error;
    }
  });

  app.post("/auth/login", {
    config: { rateLimit: { max: 10, timeWindow: "15 minutes" } }
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Email and password are required" });
    }

    const user = await findUserByEmail(normalizeEmail(parsed.data.email));

    // Always run a bcrypt comparison so timing does not reveal whether the account exists.
    const isValid = await bcrypt.compare(parsed.data.password, user?.password || DUMMY_HASH);

    if (!user || !user.password || !isValid) {
      if (user && !user.password) {
        return reply.code(401).send({
          error: "This account has no password yet. Sign in with an email code, then set a password in Settings."
        });
      }
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    return issueTokens(app, reply, user);
  });

  // Set or change the password of the signed-in user.
  app.post("/auth/password", {
    preHandler: [app.authenticate],
    config: { rateLimit: { max: 10, timeWindow: "15 minutes" } }
  }, async (request, reply) => {
    const parsed = changePasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: firstIssue(parsed.error) });
    }

    const user = await getUserById(request.user.id);
    if (!user) return reply.code(404).send({ error: "User not found" });

    const demo = getDemoCredentials();
    if (demo && user.email.toLowerCase() === demo.email) {
      return reply.code(403).send({ error: "The shared demo account's password cannot be changed" });
    }

    if (user.password) {
      const current = parsed.data.currentPassword ?? "";
      const matches = current ? await bcrypt.compare(current, user.password) : false;
      if (!matches) {
        return reply.code(401).send({ error: "Current password is incorrect" });
      }
    }

    await setUserPassword(user.id, await bcrypt.hash(parsed.data.newPassword, BCRYPT_ROUNDS));
    return { success: true };
  });

  app.post("/auth/otp/send", {
    config: { rateLimit: { max: 10, timeWindow: "15 minutes" } }
  }, async (request, reply) => {
    const parsed = otpRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Enter a valid email address" });
    }

    try {
      const { expiresAt } = await requestOtp({
        email: normalizeEmail(parsed.data.email),
        ip: request.ip
      });
      return reply.code(202).send({
        message: "Verification code sent. Check your email.",
        expiresAt: expiresAt.toISOString(),
        resendAfterSeconds: 60
      });
    } catch (error) {
      if (error instanceof OtpError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ err: error }, "OTP request failed");
      return reply.code(500).send({ error: "Unable to process the verification request" });
    }
  });

  app.post("/auth/otp/verify", {
    config: { rateLimit: { max: 20, timeWindow: "15 minutes" } }
  }, async (request, reply) => {
    const parsed = otpVerifySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Enter a valid email address and six-digit code" });
    }

    try {
      const user = await verifyOtp({
        email: normalizeEmail(parsed.data.email),
        code: parsed.data.otp
      });
      return reply.send(await issueTokens(app, reply, user));
    } catch (error) {
      if (error instanceof OtpError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ err: error }, "OTP verification failed");
      return reply.code(500).send({ error: "Unable to verify the code" });
    }
  });

  app.post("/auth/refresh", {
    config: { rateLimit: { max: 60, timeWindow: "15 minutes" } }
  }, async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_COOKIE];
    if (!refreshToken) return reply.code(401).send({ error: "Session expired. Please sign in again." });

    try {
      const session = await rotateSession(app, refreshToken);
      setRefreshCookie(reply, session.refreshToken, session.expiresAt);
      return { token: session.accessToken };
    } catch (error) {
      if (error instanceof OtpError) return reply.code(error.statusCode).send({ error: error.message });
      request.log.error({ err: error }, "Session refresh failed");
      return reply.code(500).send({ error: "Unable to refresh session" });
    }
  });

  app.post("/auth/logout", async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_COOKIE];
    if (refreshToken) await revokeSession(refreshToken);
    const { httpOnly: _h, ...clearOptions } = cookieOptions();
    reply.clearCookie(REFRESH_COOKIE, clearOptions);
    return reply.code(204).send();
  });
}
