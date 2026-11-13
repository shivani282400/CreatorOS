import { FastifyInstance } from "fastify";
import { z } from "zod";
import { addPerformance, markAsPublished } from "../services/performanceService";

const metric = z.coerce.number().int().min(0).max(2_000_000_000);

const performanceSchema = z.object({
  calendarId: z.coerce.number().int().positive(),
  views: metric,
  likes: metric,
  comments: metric,
  shares: metric
});

export async function performanceRoutes(app: FastifyInstance) {
  app.post("/performance/publish", { preHandler: [app.authenticate] }, async (request, reply) => {
    const { calendarId } = request.body as { calendarId: number };

    const published = await markAsPublished(calendarId, request.user.id);

    if (!published) {
      return reply.code(404).send({
        success: false,
        error: "Scheduled content not found"
      });
    }

    return {
      success: true,
      data: published
    };
  });

  app.post("/performance/add", { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = performanceSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "Views, likes, comments and shares must be whole numbers of 0 or more"
      });
    }

    const { calendarId, views, likes, comments, shares } = parsed.data;

    const analyzed = await addPerformance(calendarId, request.user.id, {
      views,
      likes,
      comments,
      shares
    });

    if (!analyzed) {
      return reply.code(404).send({
        success: false,
        error: "Scheduled content not found"
      });
    }

    return {
      success: true,
      data: analyzed
    };
  });
}
