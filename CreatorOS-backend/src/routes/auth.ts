import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { z } from "zod";
import { createUser, findUserByEmail } from "../services/userService";
import {
  createSession,
  normalizeEmail,
  OtpError,
  requestOtp,
  revokeSession,
  rotateSession,
  verifyOtp
} from "../services/otpService";

const otpRequestSchema = z.object({ email: z.string().trim().email().max(320) });
const otpVerifySchema = z.object({
  email: z.string().trim().email().max(320),
  otp: z.string().regex(/^\d{6}$/, "Enter the six-digit verification code")
});
const REFRESH_COOKIE = "creatoros_refresh";

const setRefreshCookie = (reply: any, token: string, expiresAt: Date) => {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth",
    expires: expiresAt
  });
};

const issueTokens = async (app: FastifyInstance, reply: any, user: any) => {
  const session = await createSession(app, user);
  setRefreshCookie(reply, session.refreshToken, session.expiresAt);
  return {
    user: { id: user.id, email: user.email },
    token: session.accessToken
  };
};

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const { email, password } = request.body as {
      email?: string
      password?: string
    };

    if (!email || !password) {
      return reply.code(400).send({
        error: "Email and password are required"
      });
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return reply.code(409).send({
        error: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(email, hashedPassword);

    return issueTokens(app, reply, user);
  });

  app.post("/auth/login", async (request, reply) => {
    const { email, password } = request.body as {
      email?: string
      password?: string
    };

    if (!email || !password) {
      return reply.code(400).send({
        error: "Email and password are required"
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return reply.code(401).send({
        error: "Invalid credentials"
      });
    }

    const isValid = !!user.password && await bcrypt.compare(password, user.password);

    if (!isValid) {
      return reply.code(401).send({
        error: "Invalid credentials"
      });
    }

    return issueTokens(app, reply, user);
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

  app.post("/auth/refresh", async (request, reply) => {
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
    reply.clearCookie(REFRESH_COOKIE, { path: "/auth" });
    return reply.code(204).send();
  });
}
