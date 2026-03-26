import { FastifyInstance } from "fastify";
import { generateAI } from "../services/ai/aiService";
import { saveContent, updateContent } from "../services/contentService";
import type { AIContent } from "../utils/aiSchema";
import { buildContentPrompt, buildImprovePrompt } from "../utils/prompts";

export async function aiRoutes(app: FastifyInstance) {

  app.post("/ai/generate", async (request, reply) => {

    const { topic, platform, save = true } = request.body as {
      topic: string
      platform: string
      niche?: string
      tone?: string
      save?: boolean
    };

    const prompt = buildContentPrompt(topic, platform, {
      niche: (request.body as any).niche,
      tone: (request.body as any).tone
    });

    try {
      const content: AIContent = await generateAI(prompt);

      if (!save) {
        return {
          success: true,
          data: content
        };
      }

      const savedContent = await saveContent({
        topic,
        platform,
        script: content.script,
        hooks: content.hooks,
        captions: content.captions,
        threads: content.threads,
        score: content.score,
        analysis: content.analysis
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

  app.post("/ai/improve", async (request, reply) => {

    const { content } = request.body as {
      content: {
        id: number
        topic: string
        platform: string
        script?: string
        hooks?: string[]
        captions?: string[]
        threads?: string[]
        score?: number
        analysis?: {
          summary?: string
          improvements?: string[]
        }
      }
    };

    const prompt = buildImprovePrompt(content);

    try {
      const improved: AIContent = await generateAI(prompt);
      const savedContent = await updateContent(content.id, {
        topic: content.topic,
        platform: content.platform,
        script: improved.script,
        hooks: improved.hooks,
        captions: improved.captions,
        threads: improved.threads,
        score: improved.score,
        analysis: improved.analysis
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
