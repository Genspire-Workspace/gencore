// file: packages/ai/src/providers/ollama/ollama-client-options.ts

export interface IOllamaClientOptions {
  id: string;
  name: string;
  host?: string;
  fetch?: typeof fetch;
  proxy?: boolean;
  headers?: Record<string, string>;
  defaultModel?: string;
}
