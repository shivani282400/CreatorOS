import { FastifyInstance } from "fastify";
import { generateAI } from "../services/ai/aiService";
import { buildMemoryContext } from "../services/ai/contextBuilder";
import { buildContentPrompt, buildGenerateLikePrompt } from "../services/ai/prompts";
import { retrieveContextBundle } from "../services/memoryService";
import { getContentById, saveContent, updateContent } from "../services/contentService";
import { getUserById } from "../services/userService";
import type { AIContent } from "../utils/aiSchema";
import { buildImprovePrompt } from "../utils/prompts";

const getSafeMemoryContext = async (
  app: FastifyInstance,
  userId: number,
  query: string,
  user: {
    niche?: string | null;
    tone?: string | null;
    platform?: string | null;
  }
) => {
  try {
    const memory = await retrieveContextBundle(app, userId, query);

    return buildMemoryContext(memory, user);
  } catch (error) {
    app.log.error(error);
    return buildMemoryContext(
      {
        scripts: [],
        hooks: [],
        captions: []
      },
      user
    );
  }
};

export async function aiRoutes(app: FastifyInstance) {
  app.post("/ai/generate", { preHandler: [app.authenticate] }, async (request, reply) => {
    const {
      topic,
      platform,
      niche,
      tone,
      goal,
      audience,
      contentType,
      save = true
    } = request.body as {
      topic: string;
      platform?: string;
      niche?: string;
      tone?: string;
      goal?: string;
      audience?: string;
      contentType?: string;
      save?: boolean;
    };

    const userProfile = await getUserById(request.user.id);

    if (!userProfile) {
      return reply.status(404).send({
        success: false,
        error: "User not found"
      });
    }

    const resolvedPlatform = platform || userProfile.platform || "YouTube";
    const resolvedNiche = niche || userProfile.niche || "general";
    const resolvedTone = tone || userProfile.tone || "educational";

    const context = await getSafeMemoryContext(app, request.user.id, `${topic} ${goal ?? ""} ${audience ?? ""}`, {
      niche: resolvedNiche,
      tone: resolvedTone,
      platform: resolvedPlatform
    });
    const prompt = buildContentPrompt(
      topic,
      resolvedPlatform,
      resolvedNiche,
      resolvedTone,
      context,
      {
        goal,
        audience,
        contentType
      }
    );

    try {
      const content: AIContent = await generateAI(prompt);

      if (!save) {
        return {
          success: true,
          data: content
        };
      }

      const savedContent = await saveContent(
        {
          topic,
          platform: resolvedPlatform,
          script: content.script,
          hooks: content.hooks,
          captions: content.captions,
          threads: content.threads,
          score: content.score,
          analysis: content.analysis
        },
        request.user.id
      );

      return {
        success: true,
        data: savedContent
      };
    } catch (error) {
      app.log.error({ err: error }, "AI generation failed");

      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : "AI generation failed"
      });
    }
  });

  app.post("/ai/improve", { preHandler: [app.authenticate] }, async (request, reply) => {
    const { content } = request.body as {
      content: {
        id: number;
        topic: string;
        platform: string;
        script?: string;
        hooks?: string[];
        captions?: string[];
        threads?: string[];
        score?: number;
        analysis?: {
          summary?: string;
          improvements?: string[];
        };
      };
    };

    const existingContent = await getContentById(content.id, request.user.id);

    if (!existingContent) {
      return reply.status(404).send({
        success: false,
        error: "Content not found"
      });
    }

    const context = await getSafeMemoryContext(app, request.user.id, content.topic, {
      niche: undefined,
      tone: undefined,
      platform: content.platform
    });

    const prompt = buildImprovePrompt(content, context);

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
      }, request.user.id);

      if (!savedContent) {
        return reply.status(404).send({
          success: false,
          error: "Content not found"
        });
      }

      return {
        success: true,
        data: savedContent
      };
    } catch (error) {
      app.log.error({ err: error }, "AI improve failed");

      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : "AI improve failed"
      });
    }
  });

  app.post("/ai/generate-like", { preHandler: [app.authenticate] }, async (request, reply) => {
    const { contentId } = request.body as { contentId: number };

    const baseContent = await getContentById(contentId, request.user.id);

    if (!baseContent) {
      return reply.status(404).send({
        success: false,
        error: "Content not found"
      });
    }

    const context = await getSafeMemoryContext(
      app,
      request.user.id,
      baseContent.script || baseContent.topic,
      {
      niche: null,
      tone: null,
      platform: baseContent.platform
      }
    );

    const prompt = buildGenerateLikePrompt(baseContent, context);

    try {
      const aiResponse: AIContent = await generateAI(prompt);

      return {
        success: true,
        data: aiResponse
      };
    } catch (error) {
      app.log.error({ err: error }, "AI generate-like failed");

      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : "AI generate-like failed"
      });
    }
  });
}
