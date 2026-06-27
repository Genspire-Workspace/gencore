// file: packages/ai/src/domain/generation/ai-stop-reason.ts

export type AiStopReason =
  | "stop"
  | "length"
  | "tool_use"
  | "error"
  | "aborted"
  | string;
