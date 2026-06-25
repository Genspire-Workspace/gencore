// file: packages\ai\src\chat\chat-generation-settings.ts

import type { IAiGenerationSettings } from "../common/ai-generation-settings.js";

export interface IChatGenerationSettings extends IAiGenerationSettings {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stop?: string[];
}
