// file: packages/ai/src/providers/openai-compatible/openai-compatible-client-options.ts

export interface IOpenAICompatibleClientOptions {
  id: string;
  name: string;
  baseURL: string;
  apiKey?: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  includeUsage?: boolean;
  supportsStructuredOutputs?: boolean;
  defaultModel?: string;
  fetch?: typeof fetch;
}
