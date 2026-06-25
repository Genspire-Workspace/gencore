// file: packages\ai\src\providers\openai-compatible\openai-compatible-client.ts

import type { IChatMessage } from "../../chat/chat-message.js";
import type {
  AiMessageContent,
  AiContentPart,
  IAiTextPart,
  IAiImagePart,
} from "../../common/ai-content-part.js";
import type { IChatGenerationRequest } from "../../chat/chat-generation-request.js";
import type { IChatGenerationResponse } from "../../chat/chat-generation-response.js";
import type { IChatGenerationChunk } from "../../chat/chat-generation-chunk.js";
import type { IEmbeddingGenerationRequest } from "../../embeddings/embedding-generation-request.js";
import type { IEmbeddingGenerationResponse } from "../../embeddings/embedding-generation-response.js";
import type {
  IOpenAiCompatibleProviderOptions,
  IOpenAiChatCompletionRequest,
  IOpenAiChatCompletionResponse,
  IOpenAiEmbeddingRequest,
  IOpenAiEmbeddingResponse,
  OpenAiMessageContent,
  OpenAiContentBlock,
} from "./openai-compatible-types.js";
import { AiError } from "../../errors/ai-error.js";

function mapContentToOpenAi(content: AiMessageContent): OpenAiMessageContent {
  if (typeof content === "string") {
    return content;
  }

  return content.map((part): OpenAiContentBlock => {
    switch (part.type) {
      case "text":
        return { type: "text", text: part.text };
      case "image":
        return {
          type: "image_url",
          image_url: { url: `data:${part.mimeType};base64,${part.data}` },
        };
      case "tool_call":
        throw new AiError(
          "OpenAI-compatible provider does not support content part type 'tool_call' in request mapping.",
        );
      case "tool_result":
        throw new AiError(
          "OpenAI-compatible provider does not support content part type 'tool_result' in request mapping.",
        );
      case "thinking":
        throw new AiError(
          "OpenAI-compatible provider does not support content part type 'thinking' in request mapping.",
        );
      default:
        throw new AiError(
          `OpenAI-compatible provider does not support content part type '${(part as { type: string }).type}' in request mapping.`,
        );
    }
  });
}

function mapContentFromOpenAi(content: OpenAiMessageContent | undefined): AiMessageContent {
  if (content === undefined || content === null) {
    return "";
  }

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map((block): AiContentPart => {
      if ("image_url" in block && block.type === "image_url") {
        const url = block.image_url.url;
        const dataUrlMatch = url.match(/^data:([^;]+);base64,(.+)$/);
        if (dataUrlMatch) {
          return {
            type: "image",
            data: dataUrlMatch[2]!,
            mimeType: dataUrlMatch[1]!,
          } satisfies IAiImagePart;
        }
        return {
          type: "image",
          data: url,
          mimeType: "image/unknown",
        } satisfies IAiImagePart;
      }
      return {
        type: "text",
        text: "text" in block ? block.text : JSON.stringify(block),
      } satisfies IAiTextPart;
    }) as AiContentPart[];
  }

  return "";
}

export class OpenAiCompatibleClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly defaultChatModel?: string;
  private readonly defaultEmbeddingModel?: string;

  constructor(private readonly options: IOpenAiCompatibleProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.defaultChatModel = options.defaultChatModel;
    this.defaultEmbeddingModel = options.defaultEmbeddingModel;

    this.headers = {
      "Content-Type": "application/json",
    };

    if (options.apiKey) {
      this.headers["Authorization"] = `Bearer ${options.apiKey}`;
    }

    if (options.headers) {
      Object.assign(this.headers, options.headers);
    }
  }

  get providerId(): string {
    return this.options.id;
  }

  get providerDisplayName(): string {
    return this.options.displayName;
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

    const body: IOpenAiChatCompletionRequest = {
      model,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: mapContentToOpenAi(m.content),
        ...(m.name ? { name: m.name } : {}),
      })),
    };

    if (request.settings?.temperature !== undefined) {
      body.temperature = request.settings.temperature;
    }
    if (request.settings?.topP !== undefined) {
      body.top_p = request.settings.topP;
    }
    if (request.settings?.maxTokens !== undefined) {
      body.max_tokens = request.settings.maxTokens;
    }
    if (request.settings?.stop !== undefined) {
      body.stop = request.settings.stop;
    }
    if (request.settings?.reasoningEffort !== undefined) {
      body.reasoning = { effort: request.settings.reasoningEffort };
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
      signal: request.settings?.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new AiError(
        `OpenAI-compatible request failed with status ${response.status}.${text ? ` ${text}` : ""}`,
      );
    }

    const data = (await response.json()) as IOpenAiChatCompletionResponse;
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

    const body: IOpenAiChatCompletionRequest = {
      model,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: mapContentToOpenAi(m.content),
        ...(m.name ? { name: m.name } : {}),
      })),
      stream: true,
    };

    if (request.settings?.temperature !== undefined) {
      body.temperature = request.settings.temperature;
    }
    if (request.settings?.topP !== undefined) {
      body.top_p = request.settings.topP;
    }
    if (request.settings?.maxTokens !== undefined) {
      body.max_tokens = request.settings.maxTokens;
    }
    if (request.settings?.stop !== undefined) {
      body.stop = request.settings.stop;
    }
    if (request.settings?.reasoningEffort !== undefined) {
      body.reasoning = { effort: request.settings.reasoningEffort };
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
      signal: request.settings?.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new AiError(
        `OpenAI-compatible request failed with status ${response.status}.${text ? ` ${text}` : ""}`,
      );
    }

    if (!response.body) {
      throw new AiError("No response body for streaming request.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (!trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") return;

          try {
            const parsed: IOpenAiChatCompletionResponse = JSON.parse(data);
            yield this.mapStreamChunk(parsed, this.options.id);
          } catch {
            continue;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async generateEmbedding(
    request: IEmbeddingGenerationRequest,
  ): Promise<IEmbeddingGenerationResponse> {
    const model = request.model ?? this.defaultEmbeddingModel;
    if (!model) {
      throw new AiError(
        "No embedding model was provided and no default embedding model is configured.",
      );
    }

    const body: IOpenAiEmbeddingRequest = {
      model,
      input: request.input,
    };

    if (request.dimensions !== undefined) {
      body.dimensions = request.dimensions;
    }

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
      signal: request.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new AiError(
        `OpenAI-compatible request failed with status ${response.status}.${text ? ` ${text}` : ""}`,
      );
    }

    const data = (await response.json()) as IOpenAiEmbeddingResponse;
    return this.mapEmbeddingResponse(data, this.options.id);
  }

  private mapChatResponse(
    data: IOpenAiChatCompletionResponse,
    providerId: string,
  ): IChatGenerationResponse {
    const choice = data.choices[0];
    const message: IChatMessage = {
      role: (choice?.message?.role as IChatMessage["role"]) ?? "assistant",
      content: mapContentFromOpenAi(choice?.message?.content),
    };
    return {
      id: data.id,
      provider: providerId,
      model: data.model,
      message,
      finishReason: choice?.finish_reason,
      usage: data.usage
        ? {
            inputTokens: data.usage.prompt_tokens,
            outputTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      raw: data,
    };
  }

  private mapStreamChunk(
    data: IOpenAiChatCompletionResponse,
    providerId: string,
  ): IChatGenerationChunk {
    const choice = data.choices[0];
    const chunk: IChatGenerationChunk = {
      id: data.id,
      provider: providerId,
      model: data.model,
      raw: data,
    };

    if (choice?.delta?.content !== undefined && choice.delta.content !== "") {
      chunk.delta = choice.delta.content;
    }

    const reasoning = choice?.delta?.reasoning_content ?? choice?.delta?.reasoning;
    if (reasoning !== undefined && reasoning !== "") {
      chunk.reasoningDelta = reasoning;
    }

    if (choice?.finish_reason) {
      chunk.finishReason = choice.finish_reason;
    }

    if (data.usage) {
      chunk.usage = {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      };
    }

    return chunk;
  }

  private mapEmbeddingResponse(
    data: IOpenAiEmbeddingResponse,
    providerId: string,
  ): IEmbeddingGenerationResponse {
    return {
      provider: providerId,
      model: data.model,
      embeddings: data.data.map((item) => ({
        index: item.index,
        embedding: item.embedding,
      })),
      usage: data.usage
        ? {
            inputTokens: data.usage.prompt_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      raw: data,
    };
  }
}
