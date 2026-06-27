// file: packages/ai/src/providers/openai-compatible/openai-compatible-client.ts

import type { IAiClient } from "../ai-provider-client.js";
import type { AiClientKind } from "../ai-provider-client-kind.js";
import type { IChatGenerator } from "../../domain/chat/chat-generator.js";
import type { IEmbeddingGenerator } from "../../domain/embeddings/embedding-generator.js";
import type { IOpenAICompatibleClientOptions } from "./openai-compatible-client-options.js";
import { OpenAICompatibleChatGenerator } from "./openai-compatible-chat-generator.js";
import { OpenAICompatibleEmbeddingGenerator } from "./openai-compatible-embedding-generator.js";

export class OpenAICompatibleClient implements IAiClient {
  readonly id: string;
  readonly name: string;
  readonly kind: AiClientKind = "openai-compatible";
  readonly chat?: IChatGenerator;
  readonly embeddings?: IEmbeddingGenerator;

  constructor(options: IOpenAICompatibleClientOptions) {
    this.id = options.id;
    this.name = options.name;
    this.chat = new OpenAICompatibleChatGenerator(options);
    this.embeddings = new OpenAICompatibleEmbeddingGenerator(options);
  }

  supportsChat(): boolean {
    return true;
  }

  supportsEmbeddings(): boolean {
    return true;
  }
}
