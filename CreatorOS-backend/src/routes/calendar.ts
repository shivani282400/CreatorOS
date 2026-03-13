import { FastifyInstance } from "fastify";
import { scheduleContent, getCalendar } from "../services/calendarService";

export async function calendarRoutes(app: FastifyInstance) {

  app.post("/calendar/schedule", async (request) => {

    const scheduled = await scheduleContent(request.body);

    return {
      success: true,
      data: scheduled
    };

  });

  app.get("/calendar", async () => {

    const items = await getCalendar();

    return {
      success: true,
      data: items
    };

  });

}
