import { FastifyInstance } from "fastify";
import { addPerformance, markAsPublished } from "../services/performanceService";

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
    const {
      calendarId,
      views,
      likes,
      comments,
      shares
    } = request.body as {
      calendarId: number;
      views: number;
      likes: number;
      comments: number;
      shares: number;
    };

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
