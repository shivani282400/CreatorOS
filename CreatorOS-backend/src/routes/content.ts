import { FastifyInstance } from "fastify";
import { saveContent, getContent, deleteContent } from "../services/contentService";

export async function contentRoutes(app: FastifyInstance) {

  app.post("/content", async (request) => {

    const saved = await saveContent(request.body);

    return {
      success: true,
      data: saved
    };

  });

  app.get("/content", async () => {

    const items = await getContent();

    return {
      success: true,
      data: items
    };

  });

  app.delete("/content/:id", async (request) => {

    const { id } = request.params as { id: string };

    await deleteContent(Number(id));

    return { success: true };
  });

}
