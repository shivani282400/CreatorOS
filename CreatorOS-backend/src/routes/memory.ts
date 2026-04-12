import { FastifyInstance } from "fastify";
import {
  getDominantStyle,
  retrieveContextBundle,
  retrieveMemorySummary
} from "../services/memoryService";

export async function memoryRoutes(app: FastifyInstance) {
  app.get("/memory/summary", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const summaryMemory = await retrieveMemorySummary(request.user.id);

      return {
        summary: summaryMemory?.text ?? "",
        styleInsights: summaryMemory?.style ?? null
      };
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        error: "Memory summary failed"
      });
    }
  });

  app.get("/memory/search", { preHandler: [app.authenticate] }, async (request, reply) => {
    const { q } = request.query as { q?: string };

    if (!q?.trim()) {
      return reply.code(400).send({ error: "Query required" });
    }

    try {
      const results = await retrieveContextBundle(app, request.user.id, q);

      return results;
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        error: "Memory search failed"
      });
    }
  });
}
