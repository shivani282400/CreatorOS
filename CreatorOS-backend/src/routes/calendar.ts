import { FastifyInstance } from "fastify";
import { scheduleContent, getCalendar } from "../services/calendarService";

export async function calendarRoutes(app: FastifyInstance) {

  app.post("/calendar/schedule", { preHandler: [app.authenticate] }, async (request, reply) => {

    const { contentId, date } = (request.body ?? {}) as {
      contentId?: number
      date?: string
    };

    if (!Number.isInteger(contentId) || !date || !/^\d{4}-\d{2}-\d{2}/.test(date)) {
      return reply.code(400).send({ success: false, error: "A content id and a valid date are required" });
    }

    const scheduled = await scheduleContent(app, contentId as number, date.slice(0, 10), request.user.id);

    if (!scheduled) {
      return reply.code(404).send({ success: false, error: "Content not found" });
    }

    return {
      success: true,
      data: scheduled
    };

  });

  app.get("/calendar", { preHandler: [app.authenticate] }, async (request) => {

    const items = await getCalendar(request.user.id);

    return {
      success: true,
      data: items
    };

  });

}
