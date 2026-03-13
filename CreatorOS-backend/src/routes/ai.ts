import { FastifyInstance } from "fastify";
import { generateAI } from "../services/ai/aiService";
import { saveContent } from "../services/contentService";
import type { AIContent } from "../utils/aiSchema";
import { buildContentPrompt } from "../utils/prompts";

export async function aiRoutes(app: FastifyInstance) {

  app.post("/ai/generate", async (request, reply) => {

    const { topic, platform } = request.body as any;

    const prompt = buildContentPrompt(topic, platform);

    try {
      const content: AIContent = await generateAI(prompt);
      const savedContent = await saveContent({
        topic,
        platform,
        script: content.script,
        hooks: content.hooks,
        captions: content.captions,
        threads: content.threads
      });

      return {
        success: true,
        data: savedContent
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: "AI response schema invalid"
      });
    }
  });

}
