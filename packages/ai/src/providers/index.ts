// file: packages/ai/src/providers/index.ts

export type { AiClientKind } from "./ai-provider-client-kind.js";
export type { IAiClient } from "./ai-provider-client.js";
export { AiClientRegistry } from "./ai-provider-client-registry.js";

export * from "./ollama/index.js";
export * from "./openai-compatible/index.js";