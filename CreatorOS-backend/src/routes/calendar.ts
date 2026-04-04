import { FastifyInstance } from "fastify";
import { scheduleContent, getCalendar } from "../services/calendarService";

export async function calendarRoutes(app: FastifyInstance) {

  app.post("/calendar/schedule", { preHandler: [app.authenticate] }, async (request) => {

    const { contentId, date } = request.body as {
      contentId: number
      date: string
    };

    const scheduled = await scheduleContent(app, contentId, date, request.user.id);

    return {
      success: true,
      data: scheduled
    };

  });

  app.get("/calendar", { preHandler: [app.authenticate] }, async () => {

    const items = await getCalendar();

    return {
      success: true,
      data: items
    };

  });

}
