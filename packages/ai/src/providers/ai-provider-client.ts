// file: packages/ai/src/providers/ai-provider-client.ts

import type { IChatGenerator } from "../domain/chat/chat-generator.js";
import type { IEmbeddingGenerator } from "../domain/embeddings/embedding-generator.js";
import type { AiClientKind } from "./ai-provider-client-kind.js";

export interface IAiClient {
  id: string;
  name: string;
  kind: AiClientKind;
  chat?: IChatGenerator;
  embeddings?: IEmbeddingGenerator;

  supportsChat(): boolean;
  supportsEmbeddings(): boolean;
}
