import Fastify from "fastify";
import cors from "@fastify/cors";
import { aiRoutes } from "./routes/ai";
import { contentRoutes } from "./routes/content";
import { calendarRoutes } from "./routes/calendar";

export const buildApp = () => {
  const app = Fastify({
    logger: true
  });

  app.register(cors, {
    origin: true
  });

  app.register(aiRoutes);
  app.register(contentRoutes);
  app.register(calendarRoutes);

  app.get("/health", async () => {
    return { status: "ok" };
  });

  return app;
};
