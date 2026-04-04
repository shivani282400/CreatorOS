import { FastifyInstance } from "fastify";
import { retrieveContextBundle } from "../services/memoryService";

export async function memoryRoutes(app: FastifyInstance) {
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
