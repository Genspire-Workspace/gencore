// file: packages\ai\src\clients\openai-compatible\openai-compatible-chat-generator.ts

import type { IChatGenerator } from "../../chat/chat-generator.js";
import type { IChatGenerationRequest } from "../../chat/chat-generation-request.js";
import type { IChatGenerationResponse } from "../../chat/chat-generation-response.js";
import type { IChatGenerationChunk } from "../../chat/chat-generation-chunk.js";
import type { IChatMessage } from "../../chat/chat-message.js";
import type {
  AiMessageContent,
  AiContentPart,
} from "../../common/ai-content-part.js";
import type { AiStopReason } from "../../common/ai-stop-reason.js";
import type { IAiTokenUsage } from "../../common/ai-token-usage.js";
import type { IOpenAICompatibleClientOptions } from "./openai-compatible-client-options.js";
import { AiError } from "../../errors/ai-error.js";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  generateText,
  streamText,
  type ModelMessage,
  type LanguageModelUsage,
  type JSONValue,
} from "ai";

export class OpenAICompatibleChatGenerator implements IChatGenerator {
  private readonly options: IOpenAICompatibleClientOptions;

  constructor(options: IOpenAICompatibleClientOptions) {
    this.options = options;
  }

  async generateChatCompletion(
    request: IChatGenerationRequest,
  ): Promise<IChatGenerationResponse> {
    const provider = this.createProvider(request.apiKey);
    const modelId = this.resolveModelId(request);
    const model = provider.chatModel(modelId);
    const messages = this.convertToModelMessages(request.messages);
    const hasSystemMessage = request.messages.some(
      (m) => m.role === "system",
    );

    const result = await generateText({
      model,
      messages,
      allowSystemInMessages: hasSystemMessage || undefined,
      maxOutputTokens: request.settings?.maxTokens,
      temperature: request.settings?.temperature,
      topP: request.settings?.topP,
      stopSequences: request.settings?.stop,
      abortSignal: request.signal ?? request.settings?.signal,
      providerOptions: this.buildProviderOptions(request),
    });

    return {
      id: crypto.randomUUID(),
      provider: this.options.id,
      model: modelId,
      message: {
        role: "assistant",
        content: result.text,
      },
      finishReason: this.mapFinishReason(result.finishReason),
      usage: this.mapUsage(result.usage),
      raw: result,
    };
  }

  async *streamChatCompletion(
    request: IChatGenerationRequest,
  ): AsyncIterable<IChatGenerationChunk> {
    const provider = this.createProvider(request.apiKey);
    const modelId = this.resolveModelId(request);
    const model = provider.chatModel(modelId);
    const messages = this.convertToModelMessages(request.messages);
    const hasSystemMessage = request.messages.some(
      (m) => m.role === "system",
    );

    const result = streamText({
      model,
      messages,
      allowSystemInMessages: hasSystemMessage || undefined,
      maxOutputTokens: request.settings?.maxTokens,
      temperature: request.settings?.temperature,
      topP: request.settings?.topP,
      stopSequences: request.settings?.stop,
      abortSignal: request.signal ?? request.settings?.signal,
      providerOptions: this.buildProviderOptions(request),
    });

    const responseId = crypto.randomUUID();

    for await (const part of result.stream) {
      switch (part.type) {
        case "text-delta":
          yield {
            id: responseId,
            type: "text_delta" as const,
            provider: this.options.id,
            model: modelId,
            delta: part.text,
            raw: part,
          };
          break;
        case "reasoning-delta":
          yield {
            id: responseId,
            type: "reasoning_delta" as const,
            provider: this.options.id,
            model: modelId,
            reasoningDelta: part.text,
            raw: part,
          };
          break;
        case "finish":
          yield {
            id: responseId,
            type: "finish" as const,
            provider: this.options.id,
            model: modelId,
            finishReason: this.mapFinishReason(part.finishReason),
            usage: this.mapUsage(part.totalUsage),
            raw: part,
          };
          break;
        case "error":
          throw new AiError(
            typeof part.error === "string"
              ? part.error
              : "Stream error from provider",
          );
      }
    }
  }

  private resolveModelId(request: IChatGenerationRequest): string {
    const id = request.model ?? this.options.defaultModel;
    if (!id) {
      throw new AiError(
        "No model specified. Provide a model in the request or set a defaultModel in client options.",
      );
    }
    return id;
  }

  private createProvider(apiKey?: string) {
    return createOpenAICompatible({
      name: this.options.id,
      baseURL: this.options.baseURL,
      apiKey: apiKey ?? this.options.apiKey,
      headers: this.options.headers,
      queryParams: this.options.queryParams,
      includeUsage: this.options.includeUsage,
      supportsStructuredOutputs: this.options.supportsStructuredOutputs,
      fetch: this.options.fetch,
    });
  }

  private buildProviderOptions(
    request: IChatGenerationRequest,
  ): Record<string, Record<string, JSONValue>> | undefined {
    const providerOpts: Record<string, JSONValue> = {};

    if (request.settings?.reasoningEffort) {
      providerOpts.reasoningEffort = request.settings.reasoningEffort;
    }
    if (request.userId) {
      providerOpts.user = request.userId;
    }

    if (Object.keys(providerOpts).length === 0) {
      return undefined;
    }

    return { [this.options.id]: providerOpts };
  }

  private convertToModelMessages(messages: IChatMessage[]): ModelMessage[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: this.convertContent(msg.content),
      ...(msg.name ? { name: msg.name } : {}),
    })) as ModelMessage[];
  }

  private convertContent(content: AiMessageContent): unknown {
    if (typeof content === "string") {
      return content;
    }

    return content
      .filter((part) => part.type !== "thinking")
      .map((part) => this.convertContentPart(part));
  }

  private convertContentPart(part: AiContentPart): unknown {
    switch (part.type) {
      case "text":
        return { type: "text" as const, text: part.text };
      case "image":
        return {
          type: "image" as const,
          image: part.data,
          mediaType: part.mimeType,
        };
      case "tool_call":
        return {
          type: "tool-call" as const,
          toolCallId: part.id,
          toolName: part.name,
          input: part.arguments,
        };
      case "tool_result":
        return {
          type: "tool-result" as const,
          toolCallId: part.toolCallId,
          toolName: "",
          output:
            typeof part.content === "string"
              ? { type: "text" as const, value: part.content }
              : { type: "json" as const, value: part.content },
        };
      default:
        return { type: "text" as const, text: JSON.stringify(part) };
    }
  }

  private mapFinishReason(reason: string): AiStopReason {
    switch (reason) {
      case "stop":
        return "stop";
      case "length":
        return "length";
      case "tool-calls":
        return "tool_use";
      case "content-filter":
        return "error";
      case "error":
        return "error";
      default:
        return reason;
    }
  }

  private mapUsage(
    usage: LanguageModelUsage | undefined,
  ): IAiTokenUsage | undefined {
    if (!usage) {
      return undefined;
    }

    const inputTokenDetails = this.mapTokenDetails(
      usage.inputTokenDetails,
    ) as IAiTokenUsage["inputTokenDetails"];

    const outputTokenDetails = this.mapTokenDetails(
      usage.outputTokenDetails,
    ) as IAiTokenUsage["outputTokenDetails"];

    return {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,

      cacheReadTokens: inputTokenDetails?.cacheReadTokens,
      cacheWriteTokens: inputTokenDetails?.cacheWriteTokens,

      inputTokenDetails,
      outputTokenDetails,
    };
  }

  private mapTokenDetails(
    details: unknown,
  ): Record<string, number | undefined> | undefined {
    if (!details || typeof details !== "object") {
      return undefined;
    }

    const mapped: Record<string, number | undefined> = {};

    for (const [key, value] of Object.entries(details)) {
      if (typeof value === "number") {
        mapped[key] = value;
      }
    }

    return Object.keys(mapped).length > 0 ? mapped : undefined;
  }
}
