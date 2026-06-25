// file: packages\ai\src\clients\ollama\ollama-client.ts

import type { IAiClient } from "../ai-client.js";
import type { AiClientKind } from "../ai-client-kind.js";
import type { IChatGenerator } from "../../chat/chat-generator.js";
import type { IEmbeddingGenerator } from "../../embeddings/embedding-generator.js";
import type { IOllamaClientOptions } from "./ollama-client-options.js";
import { OllamaChatGenerator } from "./ollama-chat-generator.js";
import { OllamaEmbeddingGenerator } from "./ollama-embedding-generator.js";

export class OllamaClient implements IAiClient {
  readonly id: string;
  readonly name: string;
  readonly kind: AiClientKind = "ollama";
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
