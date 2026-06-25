// file: packages\ai\src\providers\ai-provider.ts

import type { IChatGenerator } from "../../chat/chat-generator.js";
import type { IEmbeddingGenerator } from "../../embeddings/embedding-generator.js";

export interface IAiRuntimeProvider {
  id: string;
  displayName: string;
  chat?: IChatGenerator;
  embeddings?: IEmbeddingGenerator;

  supportsChat(): boolean;
  supportsEmbeddings(): boolean;
}
