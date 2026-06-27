// file: packages/ai/src/providers/ai-provider-client.ts

import type { IChatGenerator } from "../domain/chat/chat-generator.js";
import type { IEmbeddingGenerator } from "../domain/embeddings/embedding-generator.js";
import type { AiProviderClientKind } from "./ai-provider-client-kind.js";

export interface IAiProviderClient {
  id: string;
  name: string;
  kind: AiProviderClientKind;
  chat?: IChatGenerator;
  embeddings?: IEmbeddingGenerator;

  supportsChat(): boolean;
  supportsEmbeddings(): boolean;
}
