// file: packages/ai/src/extension/index.ts

export { aiExtension } from "./ai-extension.js";
export type {
  IAiDefaults,
  IAiExtensionOptions,
  IAiProviderResolutionInput,
  IAiProviderResolutionResult,
  IAiProviderResolver,
} from "./ai-extension.js";
export { aiServerExtension } from "../server/ai-server-extension.js";
export type { IAiServerExtensionOptions } from "../server/ai-server-extension.js";
