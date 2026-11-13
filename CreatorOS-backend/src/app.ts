import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { aiRoutes } from "./routes/ai";
import { contentRoutes } from "./routes/content";
import { calendarRoutes } from "./routes/calendar";
import { memoryRoutes } from "./routes/memory";
import { performanceRoutes } from "./routes/performance";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/user";
import { insightsRoutes } from "./routes/insights";
import { db } from "./plugins/db";
import { getJwtSecret, isOriginAllowed } from "./config";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: any;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { id: number; email?: string };
    user: { id: number; email?: string };
  }
}

export const buildApp = () => {
  const app = Fastify({
    logger: true,
    trustProxy: process.env.TRUST_PROXY === "true",
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true
  });

  const jwtSecret = getJwtSecret();

  app.register(cors, {
    origin: (origin, callback) => {
      callback(null, isOriginAllowed(origin));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  });

  app.addHook("onSend", async (_request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("Cross-Origin-Resource-Policy", "same-site");
  });

  app.register(cookie);
  app.register(rateLimit, { global: false });

  app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024
    }
  });

  app.register(jwt, {
    secret: jwtSecret
  });

  app.decorate("authenticate", async function authenticate(request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (error) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
  });

  app.register(authRoutes);
  app.register(userRoutes);
  app.register(aiRoutes);
  app.register(contentRoutes);
  app.register(calendarRoutes);
  app.register(memoryRoutes);
  app.register(performanceRoutes);
  app.register(insightsRoutes);

  app.get("/", async () => {
    return { name: "CreatorOS API", status: "running", version: "1.0.0" };
  });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  // Readiness probe: confirms the database is reachable without leaking error details.
  app.get("/health/ready", async (request, reply) => {
    try {
      await db.query("SELECT 1");
      return { status: "ok", database: "up" };
    } catch (error) {
      request.log.error({ err: error }, "Readiness check failed");
      return reply.code(503).send({ status: "degraded", database: "down" });
    }
  });

  app.setErrorHandler((error: any, request, reply) => {
    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;

    if (statusCode >= 500) {
      request.log.error({ err: error }, "Unhandled error");
      return reply.status(statusCode).send({
        error: "Internal Server Error",
        message: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred."
      });
    }

    // Client errors (validation, rate limit, payload too large, ...) are safe to surface.
    return reply.status(statusCode).send({ error: error.message });
  });

  return app;
};
