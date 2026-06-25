// file: packages\ai\src\clients\ai-client.ts

import type { IChatGenerator } from "../chat/chat-generator.js";
import type { IEmbeddingGenerator } from "../embeddings/embedding-generator.js";
import type { AiClientKind } from "./ai-client-kind.js";

export interface IAiClient {
  id: string;
  name: string;
  kind: AiClientKind;
  chat?: IChatGenerator;
  embeddings?: IEmbeddingGenerator;

  supportsChat(): boolean;
  supportsEmbeddings(): boolean;
}
