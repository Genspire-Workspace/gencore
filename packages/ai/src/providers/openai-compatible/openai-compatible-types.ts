// file: packages\ai\src\providers\openai-compatible\openai-compatible-types.ts

export interface IOpenAiCompatibleProviderOptions {
  id: string;
  displayName: string;
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  defaultChatModel?: string;
  defaultEmbeddingModel?: string;
}

export type OpenAiContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: string } };

export type OpenAiMessageContent = string | OpenAiContentBlock[];

export interface IOpenAiChatCompletionRequest {
  model: string;
  messages: Array<{ role: string; content: OpenAiMessageContent; name?: string }>;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stop?: string[];
  stream?: boolean;
  reasoning?: {
    effort?: string;
  };
}

export interface IOpenAiChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    message?: { role: string; content: OpenAiMessageContent; reasoning_content?: string; reasoning?: string };
    delta?: { role?: string; content?: string; reasoning_content?: string; reasoning?: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface IOpenAiEmbeddingRequest {
  model: string;
  input: string | string[];
  dimensions?: number;
}

export interface IOpenAiEmbeddingResponse {
  model: string;
  data: Array<{
    index: number;
    embedding: number[];
  }>;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}
