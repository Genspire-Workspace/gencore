// file: packages\ai\src\providers\anthropic-compatible\anthropic-compatible-client.ts

import type { IChatMessage } from "../../chat/chat-message.js";
import type {
  AiMessageContent,
  AiContentPart,
  IAiTextPart,
} from "../../common/ai-content-part.js";
import type { AiReasoningEffort } from "../../common/ai-generation-settings.js";
import type { IChatGenerationRequest } from "../../chat/chat-generation-request.js";
import type { IChatGenerationResponse } from "../../chat/chat-generation-response.js";
import type { IChatGenerationChunk } from "../../chat/chat-generation-chunk.js";
import type {
  IAnthropicCompatibleProviderOptions,
  IAnthropicMessage,
  IAnthropicChatCompletionRequest,
  IAnthropicChatCompletionResponse,
  IAnthropicStreamEvent,
  AnthropicContentBlock,
} from "./anthropic-compatible-types.js";
import { AiError } from "../../errors/ai-error.js";

function mapThinkingConfig(effort: AiReasoningEffort): IAnthropicChatCompletionRequest["thinking"] {
  switch (effort) {
    case "none":
      return { type: "disabled" };
    case "minimal":
    case "low":
      return { type: "enabled", budget_tokens: 1024 };
    case "medium":
      return { type: "enabled", budget_tokens: 4096 };
    case "high":
    case "xhigh":
      return { type: "enabled", budget_tokens: 8192 };
    default:
      return { type: "adaptive" };
  }
}

function mapContentToAnthropic(content: AiMessageContent): string | AnthropicContentBlock[] {
  if (typeof content === "string") {
    return content;
  }

  return content.map((part): AnthropicContentBlock => {
    switch (part.type) {
      case "text":
        return { type: "text", text: part.text };
      case "image":
        throw new AiError(
          "Anthropic-compatible provider does not support content part type 'image' in request mapping.",
        );
      case "tool_call":
        throw new AiError(
          "Anthropic-compatible provider does not support content part type 'tool_call' in request mapping.",
        );
      case "tool_result":
        throw new AiError(
          "Anthropic-compatible provider does not support content part type 'tool_result' in request mapping.",
        );
      case "thinking":
        return { type: "thinking", text: part.text };
      default:
        throw new AiError(
          `Anthropic-compatible provider does not support content part type '${(part as { type: string }).type}' in request mapping.`,
        );
    }
  });
}

function mapContentFromAnthropic(blocks: AnthropicContentBlock[] | undefined): AiMessageContent {
  if (!blocks || blocks.length === 0) {
    return "";
  }

  if (blocks.every((b) => b.type === "text")) {
    const joined = blocks.map((b) => ("text" in b ? b.text : "")).join("");
    return joined;
  }

  return blocks.map((block): AiContentPart => {
    switch (block.type) {
      case "text":
        return { type: "text", text: block.text } satisfies IAiTextPart;
      case "thinking":
        return { type: "thinking", text: block.text, signature: block.signature };
      default:
        return {
          type: "text",
          text: "text" in block ? (block as { text: string }).text : JSON.stringify(block),
        } satisfies IAiTextPart;
    }
  }) as AiContentPart[];
}

function extractSystemMessage(
  messages: IChatMessage[],
): string | undefined {
  const systemMessages = messages.filter((m) => m.role === "system");
  if (systemMessages.length === 0) return undefined;

  return systemMessages
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join("\n");
}

function mapMessagesToAnthropic(messages: IChatMessage[]): {
  system?: string;
  messages: IAnthropicMessage[];
} {
  const system = extractSystemMessage(messages);
  const nonSystem = messages
    .filter((m) => m.role !== "system")
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m): IAnthropicMessage => ({
      role: m.role as "user" | "assistant",
      content: mapContentToAnthropic(m.content),
    }));

  return { system, messages: nonSystem };
}

export class AnthropicCompatibleClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly defaultChatModel?: string;

  constructor(private readonly options: IAnthropicCompatibleProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.defaultChatModel = options.defaultChatModel;

    this.headers = {
      "Content-Type": "application/json",
    };

    if (options.apiKey) {
      this.headers["x-api-key"] = options.apiKey;
    }

    if (options.headers) {
      Object.assign(this.headers, options.headers);
    }
  }

  async generateChatCompletion(
    request: IChatGenerationRequest,
  ): Promise<IChatGenerationResponse> {
    const model = request.model ?? this.defaultChatModel;
    if (!model) {
      throw new AiError(
        "No chat model was provided and no default chat model is configured.",
      );
    }

    const { system, messages } = mapMessagesToAnthropic(request.messages);

    const body: IAnthropicChatCompletionRequest = {
      model,
      messages,
      max_tokens: request.settings?.maxTokens ?? 1024,
    };

    if (system) {
      body.system = system;
    }
    if (request.settings?.temperature !== undefined) {
      body.temperature = request.settings.temperature;
    }
    if (request.settings?.topP !== undefined) {
      body.top_p = request.settings.topP;
    }
    if (request.settings?.stop !== undefined) {
      body.stop_sequences = request.settings.stop;
    }
    if (request.settings?.reasoningEffort !== undefined) {
      body.thinking = mapThinkingConfig(request.settings.reasoningEffort);
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
      signal: request.settings?.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new AiError(
        `Anthropic-compatible request failed with status ${response.status}.${text ? ` ${text}` : ""}`,
      );
    }

    const data = (await response.json()) as IAnthropicChatCompletionResponse;
    return this.mapChatResponse(data, this.options.id);
  }

  async *streamChatCompletion(
    request: IChatGenerationRequest,
  ): AsyncIterable<IChatGenerationChunk> {
    const model = request.model ?? this.defaultChatModel;
    if (!model) {
      throw new AiError(
        "No chat model was provided and no default chat model is configured.",
      );
    }

    const { system, messages } = mapMessagesToAnthropic(request.messages);

    const body: IAnthropicChatCompletionRequest = {
      model,
      messages,
      max_tokens: request.settings?.maxTokens ?? 1024,
      stream: true,
    };

    if (system) {
      body.system = system;
    }
    if (request.settings?.temperature !== undefined) {
      body.temperature = request.settings.temperature;
    }
    if (request.settings?.topP !== undefined) {
      body.top_p = request.settings.topP;
    }
    if (request.settings?.stop !== undefined) {
      body.stop_sequences = request.settings.stop;
    }
    if (request.settings?.reasoningEffort !== undefined) {
      body.thinking = mapThinkingConfig(request.settings.reasoningEffort);
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
      signal: request.settings?.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new AiError(
        `Anthropic-compatible request failed with status ${response.status}.${text ? ` ${text}` : ""}`,
      );
    }

    if (!response.body) {
      throw new AiError("No response body for streaming request.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let messageId = "";
    let currentModel = model;
    const blockTypes = new Map<number, string>();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const raw of events) {
          if (!raw.trim()) continue;

          const lines = raw.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event: "));
          const dataLine = lines.find((l) => l.startsWith("data: "));

          if (!dataLine) continue;

          const eventType = eventLine?.slice(7).trim();
          const data = dataLine.slice(6).trim();

          try {
            const parsed = JSON.parse(data) as IAnthropicStreamEvent;

            if (parsed.message) {
              messageId = parsed.message.id;
              currentModel = parsed.message.model;
            }

            if (eventType === "content_block_start" && parsed.content_block) {
              const idx = parsed.index ?? 0;
              blockTypes.set(idx, parsed.content_block.type);

              yield {
                id: messageId,
                provider: this.options.id,
                model: currentModel,
                raw: parsed,
              };
            }

            if (eventType === "content_block_delta" && parsed.delta?.text) {
              const idx = parsed.index ?? 0;
              const blockType = blockTypes.get(idx);

              yield {
                id: messageId,
                provider: this.options.id,
                model: currentModel,
                delta: parsed.delta.text,
                raw: { ...parsed, contentBlockType: blockType },
              };
            }

            if (eventType === "message_delta") {
              const chunk: IChatGenerationChunk = {
                id: messageId,
                provider: this.options.id,
                model: currentModel,
                raw: parsed,
              };

              if (parsed.delta?.stop_reason) {
                chunk.finishReason = parsed.delta.stop_reason;
              }

              if (parsed.usage) {
                chunk.usage = {
                  inputTokens: parsed.usage.input_tokens,
                  outputTokens: parsed.usage.output_tokens,
                  totalTokens: parsed.usage.input_tokens != null && parsed.usage.output_tokens != null
                    ? (parsed.usage.input_tokens ?? 0) + (parsed.usage.output_tokens ?? 0)
                    : undefined,
                  cacheReadTokens: parsed.usage.cache_read_input_tokens,
                  cacheWriteTokens: parsed.usage.cache_creation_input_tokens,
                };
              }

              yield chunk;
            }
          } catch {
            continue;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private mapChatResponse(
    data: IAnthropicChatCompletionResponse,
    providerId: string,
  ): IChatGenerationResponse {
    return {
      id: data.id,
      provider: providerId,
      model: data.model,
      message: {
        role: "assistant",
        content: mapContentFromAnthropic(data.content),
      },
      finishReason: data.stop_reason,
      usage: data.usage
        ? {
            inputTokens: data.usage.input_tokens,
            outputTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
            cacheReadTokens: data.usage.cache_read_input_tokens,
            cacheWriteTokens: data.usage.cache_creation_input_tokens,
          }
        : undefined,
      raw: data,
    };
  }
}
