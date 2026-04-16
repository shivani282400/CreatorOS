import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { aiRoutes } from "./routes/ai";
import { contentRoutes } from "./routes/content";
import { calendarRoutes } from "./routes/calendar";
import { memoryRoutes } from "./routes/memory";
import { performanceRoutes } from "./routes/performance";
import jwt from "@fastify/jwt";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/user";

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
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true
  });

  app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false
  });

  app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024
    }
  });

  app.register(jwt, {
    secret: process.env.JWT_SECRET || "supersecret"
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

  app.get("/", async () => {
    return { name: "CreatorOS API", status: "running", version: "1.0.0" };
  });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.get("/test-db", async (request, reply) => {
    try {
      const { db } = require("./plugins/db");
      const result = await db.query("SELECT NOW()");
      return { status: "ok", time: result.rows[0].now, message: "Database connection successful!" };
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: "Database connection failed", details: error.message });
    }
  });

  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    reply.status(error.statusCode || 500).send({ 
      error: "Internal Server Error", 
      message: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred."
    });
  });

  return app;
};
