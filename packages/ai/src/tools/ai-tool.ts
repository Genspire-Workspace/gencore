// file: packages\ai\src\tools\ai-tool.ts

export type AiToolParameters = Record<string, unknown>;

export interface IAiToolExecutionContext {
  toolCallId: string;
  toolName: string;
  provider?: string;
  model?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface IAiTool<TArgs = unknown, TResult = unknown> {
  name: string;
  description?: string;
  parameters?: AiToolParameters;
  execute?: (
    args: TArgs,
    context: IAiToolExecutionContext,
  ) => TResult | Promise<TResult>;
  metadata?: Record<string, unknown>;
}
