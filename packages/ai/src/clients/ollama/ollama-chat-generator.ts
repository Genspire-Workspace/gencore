// file: packages\ai\src\clients\ollama\ollama-chat-generator.ts

import type { IChatGenerator } from "../../chat/chat-generator.js";
import type { IChatGenerationRequest } from "../../chat/chat-generation-request.js";
import type { IChatGenerationResponse } from "../../chat/chat-generation-response.js";
import type { IChatGenerationChunk } from "../../chat/chat-generation-chunk.js";
import type { IChatMessage } from "../../chat/chat-message.js";
import type { AiStopReason } from "../../common/ai-stop-reason.js";
import type { IAiTokenUsage } from "../../common/ai-token-usage.js";
import type { IOllamaClientOptions } from "./ollama-client-options.js";
import { AiError } from "../../errors/ai-error.js";
import { Ollama, type Message, type ChatResponse } from "ollama";

export class OllamaChatGenerator implements IChatGenerator {
  private readonly options: IOllamaClientOptions;
  private readonly client: Ollama;

  constructor(options: IOllamaClientOptions) {
    this.options = options;
    this.client = new Ollama({
      host: options.host,
      fetch: options.fetch,
      proxy: options.proxy,
      headers: options.headers,
    });
  }

  async generateChatCompletion(
    request: IChatGenerationRequest,
  ): Promise<IChatGenerationResponse> {
    const modelId = this.resolveModelId(request);
    const response = await this.client.chat({
      model: modelId,
      messages: this.convertToOllamaMessages(request.messages),
      stream: false,
      ...this.buildChatOptions(request),
    });

    return this.toCompletionResponse(response, modelId);
  }

  async *streamChatCompletion(
    request: IChatGenerationRequest,
  ): AsyncIterable<IChatGenerationChunk> {
    const modelId = this.resolveModelId(request);
    const stream = await this.client.chat({
      model: modelId,
      messages: this.convertToOllamaMessages(request.messages),
      stream: true,
      ...this.buildChatOptions(request),
    });

    const responseId = crypto.randomUUID();

    for await (const part of stream) {
      const chunk = this.toStreamChunk(part, modelId, responseId);
      yield chunk;
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

  private buildChatOptions(
    request: IChatGenerationRequest,
  ): Record<string, unknown> {
    const opts: Record<string, unknown> = {};

    if (request.settings?.reasoningEffort) {
      opts.think = this.mapReasoningEffort(request.settings.reasoningEffort);
    }

    const options: Record<string, unknown> = {};
    if (request.settings?.temperature !== undefined) {
      options.temperature = request.settings.temperature;
    }
    if (request.settings?.topP !== undefined) {
      options.top_p = request.settings.topP;
    }
    if (request.settings?.maxTokens !== undefined) {
      options.num_predict = request.settings.maxTokens;
    }
    if (request.settings?.stop) {
      options.stop = request.settings.stop;
    }
    if (Object.keys(options).length > 0) {
      opts.options = options;
    }

    return opts;
  }

  private mapReasoningEffort(
    effort: string,
  ): boolean | "high" | "medium" | "low" {
    switch (effort) {
      case "high":
      case "xhigh":
        return "high";
      case "medium":
        return "medium";
      case "low":
      case "minimal":
        return "low";
      case "none":
        return false;
      default:
        return true;
    }
  }

  private convertToOllamaMessages(messages: IChatMessage[]): Message[] {
    return messages.map((msg) => {
      const base: Message = {
        role: msg.role,
        content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
      };
      return base;
    });
  }

  private toCompletionResponse(
    response: ChatResponse,
    modelId: string,
  ): IChatGenerationResponse {
    return {
      id: crypto.randomUUID(),
      provider: this.options.id,
      model: modelId,
      message: {
        role: "assistant",
        content: response.message.content,
      },
      finishReason: this.mapDoneReason(response.done_reason),
      usage: this.mapUsage(response),
      raw: response,
    };
  }

  private toStreamChunk(
    part: ChatResponse,
    modelId: string,
    responseId: string,
  ): IChatGenerationChunk {
    const chunk: IChatGenerationChunk = {
      id: responseId,
      provider: this.options.id,
      model: modelId,
      raw: part,
    };

    if (part.message.content) {
      chunk.type = "text_delta";
      chunk.delta = part.message.content;
    }

    if (part.message.thinking) {
      chunk.type = "reasoning_delta";
      chunk.reasoningDelta = part.message.thinking;
    }

    if (part.done) {
      chunk.type = "finish";
      chunk.finishReason = this.mapDoneReason(part.done_reason);
      chunk.usage = this.mapUsage(part);
    }

    return chunk;
  }

  private mapDoneReason(reason: string): AiStopReason {
    switch (reason) {
      case "stop":
        return "stop";
      case "length":
        return "length";
      case "load":
      case "unload":
        return "error";
      default:
        return reason || "stop";
    }
  }

  private mapUsage(
    response: ChatResponse,
  ): IAiTokenUsage | undefined {
    if (!response.prompt_eval_count && !response.eval_count) {
      return undefined;
    }
    return {
      inputTokens: response.prompt_eval_count || undefined,
      outputTokens: response.eval_count || undefined,
      totalTokens:
        (response.prompt_eval_count || 0) + (response.eval_count || 0) || undefined,
    };
  }
}
