import { FastifyInstance } from "fastify";
import { saveContent, getContent, deleteContent, searchContent } from "../services/contentService";

export async function contentRoutes(app: FastifyInstance) {

  app.post("/content", { preHandler: [app.authenticate] }, async (request) => {

    const saved = await saveContent(request.body);

    return {
      success: true,
      data: saved
    };

  });

  app.get("/content", { preHandler: [app.authenticate] }, async () => {

    const items = await getContent();

    return {
      success: true,
      data: items
    };

  });

  app.get("/content/search", { preHandler: [app.authenticate] }, async (request, reply) => {
    const { q } = request.query as { q?: string };

    if (!q?.trim()) {
      return reply.code(400).send({ error: "Query required" });
    }

    try {
      const results = await searchContent(q);

      return {
        success: true,
        data: results
      };
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        error: "Semantic search failed"
      });
    }
  });

  app.delete("/content/:id", { preHandler: [app.authenticate] }, async (request) => {

    const { id } = request.params as { id: string };

    await deleteContent(Number(id));

    return { success: true };
  });

}
