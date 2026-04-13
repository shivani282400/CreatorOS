import { FastifyInstance } from "fastify";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { db } from "../plugins/db";
import {
  retrieveContextBundle,
  retrieveMemorySummary,
  storeMemory
} from "../services/memoryService";

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
  app.post("/memory/upload-brand", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
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
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : "Brand brief upload failed"
      });
    }
  });

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
}
