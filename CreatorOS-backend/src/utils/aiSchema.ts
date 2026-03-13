import { z } from "zod";

export const AIContentSchema = z.object({
  script: z.string(),
  hooks: z.array(z.string()).min(1),
  captions: z.array(z.string()).min(1),
  threads: z.array(z.string()).min(1)
});

export type AIContent = z.infer<typeof AIContentSchema>;
