// file: packages/ai/src/providers/ollama/ollama-client.ts

import type { IAiProviderClient } from "../ai-provider-client.js";
import type { AiProviderClientKind } from "../ai-provider-client-kind.js";
import type { IChatGenerator } from "../../domain/chat/chat-generator.js";
import type { IEmbeddingGenerator } from "../../domain/embeddings/embedding-generator.js";
import type { IOllamaClientOptions } from "./ollama-client-options.js";
import { OllamaChatGenerator } from "./ollama-chat-generator.js";
import { OllamaEmbeddingGenerator } from "./ollama-embedding-generator.js";

export class OllamaClient implements IAiProviderClient {
  readonly id: string;
  readonly name: string;
  readonly kind: AiProviderClientKind = "ollama";
  readonly chat?: IChatGenerator;
  readonly embeddings?: IEmbeddingGenerator;

  constructor(options: IOllamaClientOptions) {
    this.id = options.id;
    this.name = options.name;
    this.chat = new OllamaChatGenerator(options);
    this.embeddings = new OllamaEmbeddingGenerator(options);
  }

  supportsChat(): boolean {
    return true;
  }

  supportsEmbeddings(): boolean {
    return true;
  }
}
