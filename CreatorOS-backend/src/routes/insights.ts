import { FastifyInstance } from "fastify";
import { getInsightsOverview } from "../services/insightsService";

export async function insightsRoutes(app: FastifyInstance) {
  app.get("/insights/overview", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const data = await getInsightsOverview(request.user.id);
      return { success: true, data };
    } catch (error) {
      request.log.error({ err: error }, "Insights overview failed");
      return reply.code(500).send({ success: false, error: "Unable to load insights" });
    }
  });
}
