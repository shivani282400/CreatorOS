import Fastify from "fastify";
import cors from "@fastify/cors";
import { aiRoutes } from "./routes/ai";
import { contentRoutes } from "./routes/content";
import { calendarRoutes } from "./routes/calendar";
import jwt from "@fastify/jwt";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/user";

export const buildApp = () => {
  const app = Fastify({
    logger: true
  });

  app.register(cors, {
    origin: true
  });

  app.register(jwt, {
    secret: process.env.JWT_SECRET || "supersecret"
  });

  app.decorate("authenticate", async function authenticate(request, reply) {
    try {
      await request.jwtVerify();
    } catch (error) {
      reply.code(401).send({ error: "Unauthorized" });
    }
  });

  app.register(authRoutes);
  app.register(userRoutes);
  app.register(aiRoutes);
  app.register(contentRoutes);
  app.register(calendarRoutes);

  app.get("/health", async () => {
    return { status: "ok" };
  });

  return app;
};
