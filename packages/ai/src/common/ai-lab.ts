export interface IAiLab {
  id: string;
  name: string;
  description?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}
