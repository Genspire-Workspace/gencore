// file: packages/ai/src/providers/ollama/ollama-chat-generator.ts

import type { IChatGenerator } from "../../domain/chat/chat-generator.js";
import type { IChatGenerationRequest } from "../../domain/chat/chat-generation-request.js";
import type { IChatGenerationResponse } from "../../domain/chat/chat-generation-response.js";
import type { IChatGenerationChunk } from "../../domain/chat/chat-generation-chunk.js";
import type { IChatMessage } from "../../domain/chat/chat-message.js";
import type { AiStopReason } from "../../domain/generation/ai-stop-reason.js";
import type { IAiTokenUsage } from "../../domain/models/ai-token-usage.js";
import type { IOllamaClientOptions } from "./ollama-client-options.js";
import type { IAiToolCall } from "../../domain/tools/ai-tool-call.js";
import type { IAiToolResult } from "../../domain/tools/ai-tool-result.js";
import { AiToolCallingManager } from "../../application/tools/ai-tool-calling-manager.js";
import { AiError } from "../../errors/ai-error.js";
import { Ollama, type Message, type ChatResponse } from "ollama";

type OllamaToolMessage = Message & { tool_call_id?: string };
type OllamaChatRequestWithTools = Parameters<Ollama["chat"]>[0] & {
  tools?: unknown[];
};

export class OllamaChatGenerator implements IChatGenerator {
  private readonly options: IOllamaClientOptions;
  private readonly client: Ollama;
  private readonly toolCallingManager = new AiToolCallingManager();

  constructor(options: IOllamaClientOptions) {
    this.options = options;
    this.client = new Ollama({
      host: options.host,
      fetch: options.fetch,
      proxy: options.proxy,
      headers: options.headers,
    });
  }

  async generateChat(
    request: IChatGenerationRequest,
  ): Promise<IChatGenerationResponse> {
    const modelId = this.resolveModelId(request);
    const maxToolSteps = request.settings?.maxToolSteps ?? 1;
    const messages = this.convertToOllamaMessages(request.messages);
    const tools = this.buildOllamaTools(request);

    const allToolCalls: IAiToolCall[] = [];
    const allToolResults: IAiToolResult[] = [];

    const requestBase: Partial<OllamaChatRequestWithTools> = {
      model: modelId,
      tools: tools as OllamaChatRequestWithTools["tools"],
      ...this.buildChatOptions(request),
    };

    let response = await this.client.chat({
      ...requestBase,
      messages: messages as Message[],
      stream: false,
    } as OllamaChatRequestWithTools & { stream: false });

    for (let step = 0; step < maxToolSteps; step++) {
      const toolCalls = this.extractOllamaToolCalls(
        response.message?.tool_calls ?? response,
      );

      if (toolCalls.length === 0) break;

      allToolCalls.push(...toolCalls);

      const results: IAiToolResult[] = [];
      for (const toolCall of toolCalls) {
        const toolRun = await this.toolCallingManager.run({
          toolCalls: [toolCall],
          tools: request.tools ?? [],
          provider: this.options.id,
          model: modelId,
          userId: request.userId,
          metadata: request.metadata,
          signal: request.signal ?? request.settings?.signal,
        });

        const result = toolRun.toolResults[0];
        if (result) {
          results.push(result);
        }
      }

      allToolResults.push(...results);

      if (response.message) {
        messages.push(response.message);
      }
      for (const result of results) {
        messages.push(this.createOllamaToolResultMessage(result));
      }

      response = await this.client.chat({
        ...requestBase,
        messages: messages as Message[],
        stream: false,
      } as OllamaChatRequestWithTools & { stream: false });
    }

    return {
      ...this.toCompletionResponse(response, modelId),
      toolCalls: allToolCalls.length ? allToolCalls : undefined,
      toolResults: allToolResults.length ? allToolResults : undefined,
    };
  }

  async *streamChat(
    request: IChatGenerationRequest,
  ): AsyncIterable<IChatGenerationChunk> {
    const modelId = this.resolveModelId(request);

    if (!request.tools || request.tools.length === 0) {
      yield* this.simpleStream(request, modelId);
      return;
    }

    yield* this.toolStream(request, modelId);
  }

  private async *simpleStream(
    request: IChatGenerationRequest,
    modelId: string,
  ): AsyncIterable<IChatGenerationChunk> {
    const stream = await this.client.chat({
      model: modelId,
      messages: this.convertToOllamaMessages(request.messages),
      stream: true,
      ...this.buildChatOptions(request),
    });

    const responseId = crypto.randomUUID();

    for await (const part of stream) {
      yield this.toStreamChunk(part, modelId, responseId);
    }
  }

  private async *toolStream(
    request: IChatGenerationRequest,
    modelId: string,
  ): AsyncIterable<IChatGenerationChunk> {
    const maxToolSteps = request.settings?.maxToolSteps ?? 1;
    const messages = this.convertToOllamaMessages(request.messages);
    const tools = this.buildOllamaTools(request);

    const responseId = crypto.randomUUID();
    const requestBase: Partial<OllamaChatRequestWithTools> = {
      model: modelId,
      tools: tools as OllamaChatRequestWithTools["tools"],
      ...this.buildChatOptions(request),
    };

    for (let step = 0; step < maxToolSteps; step++) {
      const stepToolCalls: IAiToolCall[] = [];
      const seenStepToolCallKeys = new Set<string>();
      let assistantMessage: Message | undefined;

      const stream = await this.client.chat({
        ...requestBase,
        messages: messages as Message[],
        stream: true,
      } as OllamaChatRequestWithTools & { stream: true });

      for await (const part of stream) {
        const chunk = this.toStreamChunk(part, modelId, responseId);
        yield chunk;

        const toolCalls = this.extractOllamaToolCalls(
          part.message?.tool_calls ?? part,
        );

        if (toolCalls.length > 0) {
          assistantMessage = part.message;

          for (const toolCall of toolCalls) {
            const toolCallKey = this.createToolCallKey(toolCall);

            if (seenStepToolCallKeys.has(toolCallKey)) {
              this.debugLog("Suppressing duplicate streamed tool call.", {
                modelId,
                toolName: toolCall.name,
                toolCallId: toolCall.id,
                step,
              });
              continue;
            }

            seenStepToolCallKeys.add(toolCallKey);
            stepToolCalls.push(toolCall);
          }
        }
      }

      if (stepToolCalls.length === 0) break;

      if (assistantMessage) {
        messages.push(assistantMessage);
      }

      for (const toolCall of stepToolCalls) {
        this.debugLog("Starting server tool execution.", {
          modelId,
          toolName: toolCall.name,
          toolCallId: toolCall.id,
          step,
        });

        yield {
          id: responseId,
          type: "tool_call_delta" as const,
          provider: this.options.id,
          model: modelId,
          toolCall,
          raw: toolCall.raw,
        };

        const toolRun = await this.toolCallingManager.run({
          toolCalls: [toolCall],
          tools: request.tools ?? [],
          provider: this.options.id,
          model: modelId,
          userId: request.userId,
          metadata: request.metadata,
          signal: request.signal ?? request.settings?.signal,
        });
        const result = toolRun.toolResults[0] ?? {
          toolCallId: toolCall.id,
          name: toolCall.name,
          error: `Tool '${toolCall.name}' execution returned no result.`,
          raw: toolCall.raw,
        };

        this.debugLog("Finished server tool execution.", {
          modelId,
          toolName: toolCall.name,
          toolCallId: toolCall.id,
          step,
          hasError: Boolean(result.error),
        });

        yield {
          id: responseId,
          type: "tool_result_delta" as const,
          provider: this.options.id,
          model: modelId,
          toolResult: result,
          raw: result.raw,
        };

        this.debugLog("Enqueued tool_result_delta.", {
          modelId,
          toolName: toolCall.name,
          toolCallId: toolCall.id,
          step,
          hasError: Boolean(result.error),
        });

        messages.push(this.createOllamaToolResultMessage(result));
      }

      this.debugLog("Resuming model loop after tool result append.", {
        modelId,
        step,
        toolCallCount: stepToolCalls.length,
      });
    }
  }

  private createToolCallKey(toolCall: IAiToolCall): string {
    return `${toolCall.name}:${this.stableStringify(toolCall.arguments)}`;
  }

  private stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(",")}]`;
    }

    if (value && typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(
          ([key, entryValue]) =>
            `${JSON.stringify(key)}:${this.stableStringify(entryValue)}`,
        );

      return `{${entries.join(",")}}`;
    }

    return JSON.stringify(value);
  }

  private debugLog(message: string, details: Record<string, unknown>): void {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.AI_DEBUG_STREAM !== "true"
    ) {
      return;
    }

    console.info("[OllamaChatGenerator]", message, details);
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

  private buildOllamaTools(
    request: IChatGenerationRequest,
  ): unknown[] | undefined {
    if (!request.tools || request.tools.length === 0) return undefined;

    return request.tools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters ?? {
          type: "object" as const,
          properties: {},
        },
      },
    }));
  }

  private extractOllamaToolCalls(value: unknown): IAiToolCall[] {
    if (!value) return [];

    let calls: unknown[] = [];
    if (Array.isArray(value)) {
      calls = value;
    } else if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (Array.isArray(record.tool_calls)) {
        calls = record.tool_calls;
      } else if (Array.isArray(record.message)) {
        calls = record.message as unknown[];
      }
    }

    return calls
      .map((c) => {
        if (!c || typeof c !== "object") return undefined;

        const obj = c as Record<string, unknown>;
        const id =
          typeof obj.id === "string"
            ? obj.id
            : "";
        const fn =
          typeof obj.function === "object" && obj.function
            ? (obj.function as Record<string, unknown>)
            : null;

        const name =
          typeof obj.name === "string"
            ? obj.name
            : (fn?.name as string | undefined) ?? "";
        const args = fn?.arguments ?? obj.arguments ?? obj.input ?? {};

        if (!name) return undefined;

        return {
          id: id || crypto.randomUUID(),
          name,
          arguments: typeof args === "string" ? this.safeParseJson(args) : args,
          raw: c,
        } as IAiToolCall;
      })
      .filter(Boolean) as IAiToolCall[];
  }

  private safeParseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private createOllamaToolResultMessage(
    result: IAiToolResult,
  ): OllamaToolMessage {
    const content = result.error
      ? JSON.stringify({ error: result.error })
      : JSON.stringify(result.result);

    return {
      role: "tool" as const,
      content,
      tool_call_id: result.toolCallId,
    };
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
        content:
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content),
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

  private mapUsage(response: ChatResponse): IAiTokenUsage | undefined {
    if (!response.prompt_eval_count && !response.eval_count) {
      return undefined;
    }
    return {
      inputTokens: response.prompt_eval_count || undefined,
      outputTokens: response.eval_count || undefined,
      totalTokens:
        (response.prompt_eval_count || 0) + (response.eval_count || 0) ||
        undefined,
    };
  }
}
