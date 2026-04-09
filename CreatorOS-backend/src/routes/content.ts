import { FastifyInstance } from "fastify";
import {
  saveContent,
  getContent,
  deleteContent,
  searchContent,
  getUploadedContent,
  getTopPerformingContent
} from "../services/contentService";

export async function contentRoutes(app: FastifyInstance) {

  app.post("/content", { preHandler: [app.authenticate] }, async (request) => {

    const saved = await saveContent(request.body, request.user.id);

    return {
      success: true,
      data: saved
    };

  });

  app.get("/content", { preHandler: [app.authenticate] }, async (request) => {

    const items = await getContent(request.user.id);

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
      const results = await searchContent(q, request.user.id);

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

  app.get("/content/uploaded", { preHandler: [app.authenticate] }, async (request) => {
    const items = await getUploadedContent(app, request.user.id);

    return {
      success: true,
      data: items
    };
  });

  app.get("/content/top-performing", { preHandler: [app.authenticate] }, async (request) => {
    const items = await getTopPerformingContent(request.user.id);

    return {
      success: true,
      data: items
    };
  });

  app.delete("/content/:id", { preHandler: [app.authenticate] }, async (request) => {

    const { id } = request.params as { id: string };

    const deleted = await deleteContent(Number(id), request.user.id);

    if (!deleted) {
      return {
        success: false,
        error: "Content not found"
      };
    }

    return { success: true };
  });

}
