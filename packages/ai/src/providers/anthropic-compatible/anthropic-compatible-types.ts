// file: packages\ai\src\providers\anthropic-compatible\anthropic-compatible-types.ts

export interface IAnthropicCompatibleProviderOptions {
  id: string;
  displayName: string;
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  defaultChatModel?: string;
}

export type AnthropicContentBlock =
  | { type: "text"; text: string; cache_control?: unknown; citations?: unknown }
  | { type: "thinking"; text: string; signature?: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string | AnthropicContentBlock[]; is_error?: boolean }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

export interface IAnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

export interface IAnthropicChatCompletionRequest {
  model: string;
  messages: IAnthropicMessage[];
  system?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  stream?: boolean;
  thinking?: {
    type: "enabled";
    budget_tokens: number;
  } | {
    type: "disabled";
  } | {
    type: "adaptive";
  };
}

export interface IAnthropicChatCompletionResponse {
  id: string;
  model: string;
  type: string;
  role: string;
  content: AnthropicContentBlock[];
  stop_reason?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

export interface IAnthropicStreamEvent {
  type: string;
  index?: number;
  delta?: {
    type?: string;
    text?: string;
    stop_reason?: string;
  };
  message?: IAnthropicChatCompletionResponse;
  content_block?: AnthropicContentBlock;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}
