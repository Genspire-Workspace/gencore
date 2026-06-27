// file: packages/ai/src/domain/chat/chat-generation-settings.ts

import type { IAiGenerationSettings } from "../generation/ai-generation-settings.js";
import type { AiToolChoice } from "../tools/ai-tool-choice.js";

export interface IChatGenerationSettings extends IAiGenerationSettings {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stop?: string[];

  toolChoice?: AiToolChoice;

  /**
   * Maximum number of model/tool/model steps.
   *
   * Defaults to 1 when omitted.
   */
  maxToolSteps?: number;
}
