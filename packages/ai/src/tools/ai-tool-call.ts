// file: packages\ai\src\tools\ai-tool-call.ts

export interface IAiToolCall<TArgs = unknown> {
  id: string;
  name: string;
  arguments: TArgs;
  raw?: unknown;
}
