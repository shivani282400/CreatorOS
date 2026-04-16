import { FastifyInstance } from "fastify";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { db } from "../plugins/db";
import {
  retrieveContextBundle,
  retrieveMemorySummary,
  storeMemory,
  performBackfill,
  deleteBrandMemory
} from "../services/memoryService";
import { getUserById } from "../services/userService";
import { generateEmbedding } from "../utils/embedding";

const maxBrandTextLength = 12000;

const extractTextFromFile = async (buffer: Buffer, mimeType: string, fileName: string) => {
  const lowerName = fileName.toLowerCase();
  const isPdf = mimeType === "application/pdf" || lowerName.endsWith(".pdf");
  const isDocx =
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx");

  if (isPdf) {
    const parsed = await pdfParse(buffer);
    return parsed.text ?? "";
  }

  if (isDocx) {
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value ?? "";
  }

  throw new Error("Unsupported file type. Please upload PDF or DOCX.");
};

export async function memoryRoutes(app: FastifyInstance) {
  // ── Upload Brand Brief ───────────────────────────────────────────────
  app.post("/memory/upload-brand", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const userId = request.user.id;
      app.log.info({ userId }, "[memory:upload-brand] Authenticated user ID found");

      const user = await getUserById(userId);

      if (!user) {
        app.log.warn({ userId }, "[memory:upload-brand] User profile not found in database for this ID");
        return reply.code(404).send({
          success: false,
          error: "User not found. Please log out and back in to refresh your session."
        });
      }

      const file = await request.file();

      if (!file) {
        return reply.code(400).send({
          success: false,
          error: "No file uploaded"
        });
      }

      const fileName = file.filename ?? "";
      const mimeType = file.mimetype ?? "";
      const buffer = await file.toBuffer();
      const extractedText = await extractTextFromFile(buffer, mimeType, fileName);
      const normalizedText = extractedText.replace(/\s+/g, " ").trim();

      if (!normalizedText) {
        return reply.code(400).send({
          success: false,
          error: "Could not extract text from file"
        });
      }

      const finalText = normalizedText.slice(0, maxBrandTextLength);

      try {
        await db.query(
          "DELETE FROM memory_embeddings WHERE user_id = $1 AND type = 'brand'",
          [request.user.id]
        );

        const stored = await storeMemory({
          userId: request.user.id,
          type: "brand",
          text: finalText,
          metadata: {
            source: "upload",
            fileName
          }
        });

        return {
          success: true,
          data: {
            id: stored.id,
            chars: finalText.length,
            message: "Brand brief uploaded successfully"
          }
        };
      } catch (error: any) {
        if (error.message.includes("not configured") || error.message.includes("extraction failed")) {
          return reply.code(503).send({
            success: false,
            error: "AI Embedding service is temporarily unavailable. Please ensure your API keys (OpenAI or OpenRouter) are correctly configured.",
            details: error.message
          });
        }
        throw error;
      }
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : "Brand brief upload failed"
      });
    }
  });

  // ── Memory Summary ───────────────────────────────────────────────────
  app.get("/memory/summary", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const summaryMemory = await retrieveMemorySummary(request.user.id);

      return {
        summary: summaryMemory?.text ?? "",
        styleInsights: summaryMemory?.style ?? null
      };
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        error: "Memory summary failed"
      });
    }
  });

  // ── Memory Search ────────────────────────────────────────────────────
  app.get("/memory/search", { preHandler: [app.authenticate] }, async (request, reply) => {
    const { q } = request.query as { q?: string };

    if (!q?.trim()) {
      return reply.code(400).send({ error: "Query required" });
    }

    try {
      const results = await retrieveContextBundle(app, request.user.id, q);
      return results;
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        error: "Memory search failed"
      });
    }
  });

  // ── Memory Status (Diagnostic) ───────────────────────────────────────
  app.get("/memory/status", { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    try {
      const memCounts = await db.query(
        `SELECT type, COUNT(*) as count FROM memory_embeddings WHERE user_id = $1 GROUP BY type ORDER BY type`,
        [userId]
      );
      const contentCount = await db.query(
        `SELECT COUNT(*) as count FROM content WHERE user_id = $1`,
        [userId]
      );
      return {
        success: true,
        userId,
        contentCount: Number(contentCount.rows[0]?.count ?? 0),
        memoryByType: memCounts.rows.map((r) => ({ type: r.type, count: Number(r.count) }))
      };
    } catch (error: any) {
      return reply.code(500).send({ success: false, error: error.message });
    }
  });

  // ── DELETE Brand Memory ──────────────────────────────────────────────
  app.delete("/memory/brand", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      await deleteBrandMemory(request.user.id);
      return { success: true, message: "Brand brief cleared successfully" };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error.message || "Failed to clear brand brief"
      });
    }
  });

  app.post("/memory/backfill", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const results = await performBackfill(request.user.id);
      return results;
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error.message || "Backfill failed"
      });
    }
  });
}
