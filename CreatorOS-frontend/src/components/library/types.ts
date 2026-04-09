export type LibraryItem = {
  id: number;
  parent_id?: number | null;
  topic: string;
  platform: string;
  script: string;
  hooks?: string[];
  captions?: string[];
  threads?: string[];
  score?: number;
  analysis?: {
    hook_strength: number;
    emotional_intensity: number;
    engagement: number;
    structure: number;
    platform_fit: number;
    summary: string;
    improvements: string[];
  };
  created_at: string;
};
