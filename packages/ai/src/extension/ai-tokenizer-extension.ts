// file: packages/ai/src/extension/ai-tokenizer-extension.ts

import type { GenExtension } from "@genspire/core";
import { AiTokenizerService } from "../application/services/ai-tokenizer-service.js";

export function aiTokenizerExtension(): GenExtension {
  return {
    name: "ai-tokenizer",
    register(app) {
      app.provide(AiTokenizerService, new AiTokenizerService());
    },
  };
}