import { FastifyInstance } from "fastify";
import type { OutgoingHttpHeaders } from "node:http";
import { z } from "zod";
import { generateAI, generateAIStream } from "../services/ai/aiService";
import { GROQ_MODEL, isGroqConfigured } from "../services/ai/groq";
import { OPENROUTER_MODEL, isOpenRouterConfigured } from "../services/ai/openrouter";
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
  },
  useBrandVoice: boolean = true
) => {
  try {
    const memory = await retrieveContextBundle(app, userId, query);

    if (!useBrandVoice) {
      memory.brand = null;
    }

    const usedBrand = !!memory.brand?.text;
    const usedMemory = (memory.scripts?.length ?? 0) + (memory.hooks?.length ?? 0) + (memory.captions?.length ?? 0);

    app.log.info(
      { userId, usedBrand, usedMemory, hasSummary: !!memory.summary },
      "[ai:generate] Memory context retrieved"
    );

    console.log(`[ai:generate] Brand memory: ${usedBrand ? memory.brand!.text.slice(0, 120) + "..." : "NOT FOUND"}`);
    console.log(`[ai:generate] Retrieved memory entries: ${usedMemory}`);

    return {
      context: buildMemoryContext(memory, user),
      usedBrand,
      usedMemory
    };
  } catch (error: any) {
    if (error.message?.includes("not configured") || error.message?.includes("extraction failed")) {
      app.log.warn({ userId, error: error.message }, "Memory context retrieval aborted: Embedding config issue. Proceeding without memory.");
    } else {
      app.log.error({ userId, err: error }, "Unexpected error retrieving memory context. Proceeding without memory.");
    }

    return {
      context: buildMemoryContext({ scripts: [], hooks: [], captions: [] }, user),
      usedBrand: false,
      usedMemory: 0
    };
  }
};


const optionalText = (max: number) => z.string().trim().max(max).nullish();

const generateSchema = z.object({
  topic: z.string().trim().min(2, "Enter a topic first").max(500, "Topic is too long"),
  platform: optionalText(60),
  niche: optionalText(120),
  tone: optionalText(120),
  goal: optionalText(120),
  audience: optionalText(200),
  contentType: optionalText(60),
  useBrandVoice: z.boolean().optional().default(true),
  save: z.boolean().optional().default(true)
});

const idSchema = z.coerce.number().int().positive();

const AI_RATE_LIMIT = {
  rateLimit: {
    max: Number(process.env.AI_RATE_LIMIT_MAX || 20),
    timeWindow: "10 minutes"
  }
};

/** Turns provider/validation failures into a message that is safe to show users. */
const friendlyAiError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";

  if (/No AI provider is configured/i.test(message)) {
    return { status: 503, message: "AI generation is not configured on this server yet." };
  }
  const detailed = process.env.NODE_ENV !== "production";

  if (/decommission|deprecated|no longer (available|supported)|model.*(not found|does not exist|not exist)|model_not_found/i.test(message)) {
    return {
      status: 503,
      message: detailed
        ? "The configured AI model is no longer available. Set GROQ_MODEL / OPENROUTER_MODEL in the backend .env to a current model and restart."
        : "The AI service is temporarily unavailable. Please try again later."
    };
  }
  if (/401|403|invalid api key|incorrect api key|unauthorized|authentication|permission/i.test(message)) {
    return {
      status: 503,
      message: detailed
        ? "The AI provider rejected the API key. Check GROQ_API_KEY / OPENROUTER_API_KEY in the backend .env."
        : "The AI service is temporarily unavailable. Please try again later."
    };
  }
  if (/rate.?limit|429|quota|overloaded|capacity/i.test(message)) {
    return { status: 503, message: "The AI providers are busy right now. Please try again in a moment." };
  }
  if (/timeout|timed out|ETIMEDOUT|aborted/i.test(message)) {
    return { status: 504, message: "The AI took too long to respond. Please try again." };
  }
  return { status: 502, message: "The AI could not produce a valid draft. Please try again." };
};

type GenerateInput = z.infer<typeof generateSchema>;

/** Resolves profile defaults, retrieves RAG memory and builds the prompt. */
const prepareGeneration = async (app: FastifyInstance, userId: number, input: GenerateInput) => {
  const userProfile = await getUserById(userId);
  if (!userProfile) return null;

  const resolvedPlatform = input.platform || userProfile.platform || "YouTube";
  const resolvedNiche = input.niche || userProfile.niche || "general";
  const resolvedTone = input.tone || userProfile.tone || "educational";

  const { context, usedBrand, usedMemory } = await getSafeMemoryContext(
    app,
    userId,
    `${input.topic} ${input.goal ?? ""} ${input.audience ?? ""}`,
    { niche: resolvedNiche, tone: resolvedTone, platform: resolvedPlatform },
    input.useBrandVoice
  );

  const prompt = buildContentPrompt(input.topic, resolvedPlatform, resolvedNiche, resolvedTone, context, {
    goal: input.goal ?? undefined,
    audience: input.audience ?? undefined,
    contentType: input.contentType ?? undefined
  });

  return { prompt, usedBrand, usedMemory, resolvedPlatform };
};


export async function aiRoutes(app: FastifyInstance) {
  // Which AI providers are available on this server (no secrets are returned).
  app.get("/ai/status", { preHandler: [app.authenticate] }, async () => {
    const embeddings = process.env.OPENAI_API_KEY
      ? "openai"
      : process.env.OPENROUTER_API_KEY
        ? "openrouter"
        : null;

    return {
      generation: {
        groq: isGroqConfigured() ? { model: GROQ_MODEL() } : null,
        openrouter: isOpenRouterConfigured() ? { model: OPENROUTER_MODEL() } : null
      },
      embeddings,
      ragEnabled: embeddings !== null
    };
  });

  app.post("/ai/generate", {
    preHandler: [app.authenticate],
    config: AI_RATE_LIMIT
  }, async (request, reply) => {
    const parsed = generateSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid request"
      });
    }

    const prepared = await prepareGeneration(app, request.user.id, parsed.data);

    if (!prepared) {
      return reply.status(404).send({ success: false, error: "User not found" });
    }

    const { prompt, usedBrand, usedMemory, resolvedPlatform } = prepared;

    try {
      const content: AIContent = await generateAI(prompt);

      if (!parsed.data.save) {
        return {
          success: true,
          data: content,
          meta: { usedBrand, usedMemory }
        };
      }

      const savedContent = await saveContent(
        {
          topic: parsed.data.topic,
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
        data: savedContent,
        meta: { usedBrand, usedMemory }
      };
    } catch (error) {
      app.log.error({ err: error }, "AI generation failed");
      const friendly = friendlyAiError(error);
      return reply.status(friendly.status).send({ success: false, error: friendly.message });
    }
  });

  /**
   * Streaming variant (Server-Sent Events). Emits:
   *   status -> { stage }                       progress label
   *   delta  -> { text }                        the script written so far
   *   done   -> { data, meta }                  validated final content
   *   error  -> { error }
   * Always generates as a draft (save is ignored); the client saves via POST /content.
   */
  app.post("/ai/generate/stream", {
    preHandler: [app.authenticate],
    config: AI_RATE_LIMIT
  }, async (request, reply) => {
    const parsed = generateSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid request"
      });
    }

    // Take over the raw response, keeping the CORS headers the plugin already set.
    const corsHeaders = Object.fromEntries(
      Object.entries(reply.getHeaders()).filter(([, value]) => value !== undefined)
    ) as OutgoingHttpHeaders;
    reply.hijack();

    reply.raw.writeHead(200, {
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });

    const send = (event: string, payload: unknown) => {
      if (!reply.raw.writableEnded) {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
      }
    };

    const controller = new AbortController();
    reply.raw.on("close", () => {
      if (!reply.raw.writableEnded) controller.abort();
    });

    const keepAlive = setInterval(() => {
      if (!reply.raw.writableEnded) reply.raw.write(": ping\n\n");
    }, 15_000);

    try {
      send("status", { stage: "Retrieving your style memory..." });

      const prepared = await prepareGeneration(app, request.user.id, parsed.data);

      if (!prepared) {
        send("error", { error: "User not found" });
        return;
      }

      send("status", { stage: "Writing your draft...", usedBrand: prepared.usedBrand, usedMemory: prepared.usedMemory });

      const content: AIContent = await generateAIStream(
        prepared.prompt,
        (script) => send("delta", { text: script }),
        controller.signal
      );

      send("done", {
        success: true,
        data: content,
        meta: { usedBrand: prepared.usedBrand, usedMemory: prepared.usedMemory }
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        app.log.error({ err: error }, "AI streaming generation failed");
        send("error", { error: friendlyAiError(error).message });
      }
    } finally {
      clearInterval(keepAlive);
      if (!reply.raw.writableEnded) reply.raw.end();
    }
  });

  app.post("/ai/improve", { preHandler: [app.authenticate], config: AI_RATE_LIMIT }, async (request, reply) => {
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

    const contentId = idSchema.safeParse(content?.id);
    if (!contentId.success || !content.topic || !content.platform) {
      return reply.status(400).send({ success: false, error: "Invalid content" });
    }

    const existingContent = await getContentById(contentId.data, request.user.id);

    if (!existingContent) {
      return reply.status(404).send({
        success: false,
        error: "Content not found"
      });
    }

    const contextData = await getSafeMemoryContext(app, request.user.id, content.topic, {
      niche: undefined,
      tone: undefined,
      platform: content.platform
    });

    const prompt = buildImprovePrompt(content, contextData.context);

    try {
      const improved: AIContent = await generateAI(prompt);
      const savedContent = await updateContent(contentId.data, {
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
      const friendly = friendlyAiError(error);
      return reply.status(friendly.status).send({ success: false, error: friendly.message });
    }
  });

  app.post("/ai/generate-like", { preHandler: [app.authenticate], config: AI_RATE_LIMIT }, async (request, reply) => {
    const parsedId = idSchema.safeParse((request.body as { contentId?: unknown } | null)?.contentId);
    if (!parsedId.success) {
      return reply.status(400).send({ success: false, error: "Invalid content id" });
    }

    const baseContent = await getContentById(parsedId.data, request.user.id);

    if (!baseContent) {
      return reply.status(404).send({
        success: false,
        error: "Content not found"
      });
    }

    const contextData = await getSafeMemoryContext(
      app,
      request.user.id,
      baseContent.script || baseContent.topic,
      {
      niche: null,
      tone: null,
      platform: baseContent.platform
      }
    );

    const prompt = buildGenerateLikePrompt(baseContent, contextData.context);

    try {
      const aiResponse: AIContent = await generateAI(prompt);
      const savedVariation = await saveContent(
        {
          parent_id: baseContent.parent_id ?? baseContent.id,
          topic: baseContent.topic,
          platform: baseContent.platform,
          script: aiResponse.script,
          hooks: aiResponse.hooks,
          captions: aiResponse.captions,
          threads: aiResponse.threads,
          score: aiResponse.score,
          analysis: aiResponse.analysis
        },
        request.user.id
      );

      return {
        success: true,
        data: savedVariation
      };
    } catch (error) {
      app.log.error({ err: error }, "AI generate-like failed");
      const friendly = friendlyAiError(error);
      return reply.status(friendly.status).send({ success: false, error: friendly.message });
    }
  });
}
