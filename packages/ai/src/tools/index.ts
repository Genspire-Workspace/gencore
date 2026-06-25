// file: packages\ai\src\tools\index.ts

export type {
  AiToolParameters,
  IAiTool,
  IAiToolExecutionContext,
} from "./ai-tool.js";

export type { IAiToolCall } from "./ai-tool-call.js";
export type { IAiToolResult } from "./ai-tool-result.js";
export type { AiToolChoice } from "./ai-tool-choice.js";

export { defineAiTool } from "./define-ai-tool.js";
export { AiToolRegistry } from "./ai-tool-registry.js";
export { AiToolResolver } from "./ai-tool-resolver.js";
export type { IAiToolResolverInput } from "./ai-tool-resolver.js";
export { AiToolExecutor } from "./ai-tool-executor.js";
export type { AiToolExecutorContext } from "./ai-tool-executor.js";
export { AiToolCallingManager } from "./ai-tool-calling-manager.js";
export type {
  IAiToolCallingManagerInput,
  IAiToolCallingManagerResult,
} from "./ai-tool-calling-manager.js";

export {
  findAiTool,
  isRecord,
  readStringField,
  readUnknownField,
  createToolCallFromUnknown,
  createToolResultFromUnknown,
} from "./ai-tool-utils.js";
