import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  saveContent,
  getContent,
  deleteContent,
  searchContent,
  getUploadedContent,
  getTopPerformingContent
} from "../services/contentService";

const stringList = z.array(z.string().max(2000)).max(30).default([]);

const contentSchema = z.object({
  topic: z.string().trim().min(1, "Topic is required").max(500),
  platform: z.string().trim().min(1, "Platform is required").max(60),
  script: z.string().max(30000).default(""),
  hooks: stringList,
  captions: stringList,
  threads: stringList,
  score: z.number().min(0).max(100).nullish(),
  analysis: z.record(z.string(), z.unknown()).nullish(),
  parent_id: z.number().int().positive().nullish()
});

export async function contentRoutes(app: FastifyInstance) {

  app.post("/content", { preHandler: [app.authenticate] }, async (request, reply) => {

    const parsed = contentSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid content"
      });
    }

    const saved = await saveContent(
      { ...parsed.data, score: parsed.data.score == null ? null : Math.round(parsed.data.score) },
      request.user.id
    );

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
    const contentId = Number(id);

    if (!Number.isInteger(contentId) || contentId <= 0) {
      return { success: false, error: "Invalid content id" };
    }

    const deleted = await deleteContent(contentId, request.user.id);

    if (!deleted) {
      return {
        success: false,
        error: "Content not found"
      };
    }

    return { success: true };
  });

}
