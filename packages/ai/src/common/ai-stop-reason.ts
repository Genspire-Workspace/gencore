// file: packages\ai\src\common\ai-stop-reason.ts

export type AiStopReason =
  | "stop"
  | "length"
  | "tool_use"
  | "error"
  | "aborted"
  | string;
