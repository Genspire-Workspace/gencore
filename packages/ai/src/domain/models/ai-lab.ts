// file: packages/ai/src/domain/models/ai-lab.ts

export interface IAiLab {
  id: string;
  name: string;
  description?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}
