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
  /**
   * If true, the tool result can be returned directly to the caller
   * instead of being sent back into the model.
   */
  returnDirect?: boolean;
  /**
   * Optional converter for model-facing tool result content.
   */
  resultConverter?(result: TResult): unknown;
  execute?: (
    args: TArgs,
    context: IAiToolExecutionContext,
  ) => TResult | Promise<TResult>;
  metadata?: Record<string, unknown>;
}
