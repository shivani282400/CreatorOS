import { z } from "zod";

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

export const AIAnalysisSchema = z.object({
  hook_strength: z.number().min(0).max(30),
  emotional_intensity: z.number().min(0).max(20),
  engagement: z.number().min(0).max(25),
  structure: z.number().min(0).max(15),
  platform_fit: z.number().min(0).max(10),
  summary: z.string().min(10),
  improvements: z.array(z.string()).min(1)
});

export const AIContentSchema = z.object({
  script: z.string().min(10),
  hooks: z.array(z.string()).min(3),
  captions: z.array(z.string()).min(1),
  threads: z.array(z.string()).min(1),
  score: z.number().transform(clampScore),
  analysis: AIAnalysisSchema
}).superRefine((value, ctx) => {
  const total =
    value.analysis.hook_strength +
    value.analysis.emotional_intensity +
    value.analysis.engagement +
    value.analysis.structure +
    value.analysis.platform_fit;

  if (Math.abs(total - value.score) > 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["score"],
      message: "Score must align logically with the analysis breakdown"
    });
  }
});

export type AIContent = z.infer<typeof AIContentSchema>;
