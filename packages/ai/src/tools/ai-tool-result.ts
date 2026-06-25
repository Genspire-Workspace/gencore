// file: packages\ai\src\tools\ai-tool-result.ts

export interface IAiToolResult<TResult = unknown> {
  toolCallId: string;
  name: string;
  result?: TResult;
  error?: string;
  raw?: unknown;
}
