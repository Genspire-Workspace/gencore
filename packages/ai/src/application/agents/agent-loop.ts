// file: packages/ai/src/application/agents/agent-loop.ts

import { AiContext } from "../../domain/context/ai-context.js";
import type { AiGenerationService } from "../services/ai-generation-service.js";
import type { IChatGenerationChunk } from "../../domain/chat/chat-generation-chunk.js";
import type { IChatGenerationRequest } from "../../domain/chat/chat-generation-request.js";
import type { IChatGenerationResponse } from "../../domain/chat/chat-generation-response.js";
import type { IChatMessage } from "../../domain/chat/chat-message.js";
import type { AiContentPart } from "../../domain/messages/ai-content-part.js";
import type { IAiToolCall } from "../../domain/tools/ai-tool-call.js";
import type { IAiTool } from "../../domain/tools/ai-tool.js";
import type { IAiToolResult } from "../../domain/tools/ai-tool-result.js";
import { AiToolCallingManager, type IAiToolCallingManagerResult } from "../tools/ai-tool-calling-manager.js";
import type {
  IAiAgentLoopOptions,
  IAiAgentResumeState,
  IAiAgentLoopResult,
  IAiAgentMaxStepsFinalMessagePrompt,
  IAiAgentLoopState,
  IAiAgentLoopStopReason,
  IAiAgentRequestOverrides,
  IAiAgentStep,
  IAiAgentToolExecutionMode,
} from "../../domain/agents/agent-types.js";

const DEFAULT_MAX_STEPS_FINAL_MESSAGE_PROMPT =
  "You have reached the maximum number of allowed tool steps. Do not call any more tools. Based only on the conversation and tool results so far, provide the best final answer to the user.";

/**
 * Abstract agent loop. The {@link run} template method drives one model step
 * per iteration, executes any tool calls itself (via {@link AiToolCallingManager}),
 * appends the turn back onto the {@link AiContext}, and fires the lifecycle
 * hooks. Subclasses override the protected hooks to customize behavior.
 */
export abstract class AgentLoop {
  constructor(
    protected readonly generationService: AiGenerationService,
    protected readonly context: AiContext,
  ) {}

  /** Called before each step. */
  protected onStepStart(_state: IAiAgentLoopState): void | Promise<void> {}

  /** Called for each streamed chunk of a step. */
  protected onStepChunk(
    _chunk: IChatGenerationChunk,
    _state: IAiAgentLoopState,
  ): void | Promise<void> {}

  /**
   * Called before the request is built. Return request overrides to merge into
   * the turn request (e.g. swap model, adjust settings).
   */
  protected onPrepareTurn(
    _state: IAiAgentLoopState,
  ): IAiAgentRequestOverrides | void | Promise<IAiAgentRequestOverrides | void> {
    return undefined;
  }

  /** Called after each step, with the executed tool results. */
  protected onStepEnd(
    _step: IAiAgentStep,
    _state: IAiAgentLoopState,
  ): void | Promise<void> {}

  /** Called before streaming the final answer after maxSteps is reached. */
  protected onMaxStepsFinalMessageStart(
    _request: IChatGenerationRequest,
    _state: IAiAgentLoopState,
  ): void | Promise<void> {}

  /** Called for each streamed chunk of the final answer after maxSteps. */
  protected onMaxStepsFinalMessageChunk(
    _chunk: IChatGenerationChunk,
    _state: IAiAgentLoopState,
  ): void | Promise<void> {}

  /** Called after the streamed final answer after maxSteps finishes. */
  protected onMaxStepsFinalMessageEnd(
    _message: IChatMessage | undefined,
    _state: IAiAgentLoopState,
  ): void | Promise<void> {}

  /** Called once when the turn (loop) finishes, with the final result. */
  protected onTurnEnd(_result: IAiAgentLoopResult): void | Promise<void> {}

  /** Custom stop predicate evaluated after each step. */
  protected stopWhen(_state: IAiAgentLoopState): boolean {
    return false;
  }

  /** Hard cap on steps. */
  protected maxSteps(): number | undefined {
    return undefined;
  }

  /** Prompt used to request a final answer after maxSteps is reached. */
  protected maxStepsFinalMessagePrompt():
    | IAiAgentMaxStepsFinalMessagePrompt
    | false
    | undefined {
    return DEFAULT_MAX_STEPS_FINAL_MESSAGE_PROMPT;
  }

  /** Controls whether tool calls are executed immediately or returned for resume. */
  protected toolExecutionMode(): IAiAgentToolExecutionMode {
    return "immediate";
  }

  /** Base overrides applied to every turn request. */
  protected baseRequestOverrides(): IAiAgentRequestOverrides {
    return {};
  }

  protected buildRequest(
    overrides?: IAiAgentRequestOverrides,
    options?: {
      context?: AiContext;
      includeAgentTools?: boolean;
      maxToolSteps?: number;
    },
  ): IChatGenerationRequest {
    const merged: IAiAgentRequestOverrides = {
      ...this.baseRequestOverrides(),
      ...overrides,
    };

    const context = options?.context ?? this.context;

    const request = context.toChatGenerationRequest({
      ...merged,
      settings: {
        maxToolSteps: options?.maxToolSteps ?? 1,
        ...merged.settings,
      },
    });

    if (options?.includeAgentTools === false) {
      return {
        ...request,
        tools: undefined,
      };
    }

    if (context.tools.length === 0) {
      return request;
    }

    const toolsByName = new Map(
      (request.tools ?? []).map((tool) => [tool.name, tool] as const),
    );

    for (const tool of context.tools) {
      toolsByName.set(tool.name, tool);
    }

    return {
      ...request,
      tools: [...toolsByName.values()],
    };
  }

  protected stripToolExecutors(tools: readonly IAiTool[] | undefined): IAiTool[] | undefined {
    if (!tools?.length) {
      return undefined;
    }

    return tools.map(({ execute: _execute, resultConverter: _resultConverter, ...tool }) => ({
      ...tool,
    }));
  }

  protected prepareStepRequest(
    request: IChatGenerationRequest,
  ): IChatGenerationRequest {
    if (this.toolExecutionMode() !== "deferred") {
      return request;
    }

    const tools = this.stripToolExecutors(request.tools);

    return {
      ...request,
      ...(tools?.length ? { tools } : { tools: undefined }),
    };
  }

  protected async createMaxStepsFinalMessage(
    context: AiContext,
    state: IAiAgentLoopState,
  ): Promise<IChatMessage | undefined> {
    const promptConfig = this.maxStepsFinalMessagePrompt();

    if (promptConfig === false) {
      return undefined;
    }

    const prompt =
      typeof promptConfig === "function"
        ? await promptConfig(state)
        : promptConfig;

    if (!prompt?.trim()) {
      return undefined;
    }

    const lastStep = state.steps[state.steps.length - 1];
    const finalContext = context.clone().addUserMessage(prompt);
    const request = this.buildRequest(
      lastStep
        ? {
            provider: lastStep.request.provider,
            model: lastStep.request.model,
            userId: lastStep.request.userId,
            signal: lastStep.request.signal,
            metadata: lastStep.request.metadata,
            settings: {
              ...lastStep.request.settings,
              maxToolSteps: 0,
            },
          }
        : undefined,
      { context: finalContext, includeAgentTools: false, maxToolSteps: 0 },
    );

    await this.onMaxStepsFinalMessageStart(request, state);

    let fullText = "";
    let lastMessage: IChatMessage | undefined;

    for await (const chunk of this.generationService.streamChat(request)) {
      await this.onMaxStepsFinalMessageChunk(chunk, state);

      if (chunk.delta) {
        fullText += chunk.delta;
      }

      if (chunk.message) {
        lastMessage = chunk.message;
      }
    }

    const message =
      lastMessage ??
      (fullText.length > 0
        ? {
            role: "assistant" as const,
            content: fullText,
          }
        : undefined);

    if (message) {
      context.addMessage(message);
    }

    await this.onMaxStepsFinalMessageEnd(message, state);

    return message;
  }

  protected createResumeState(
    context: AiContext,
    state: IAiAgentLoopState,
    toolResults: readonly IAiToolResult[],
    pendingToolCalls: readonly IAiToolCall[],
  ): IAiAgentResumeState {
    return {
      context: {
        ...context.toJSON(),
        tools: this.stripToolExecutors(context.tools) ?? [],
      },
      stepCount: state.stepCount,
      steps: state.steps,
      toolResults: [...toolResults],
      pendingToolCalls: [...pendingToolCalls],
    };
  }

  protected runToolCalls(
    response: IChatGenerationResponse,
    request: IChatGenerationRequest,
  ): Promise<IAiToolCallingManagerResult> {
    const manager = new AiToolCallingManager();

    return manager.run({
      toolCalls: response.toolCalls ?? [],
      tools: this.context.tools,
      provider: request.provider,
      model: request.model,
      userId: request.userId,
      metadata: request.metadata,
      signal: request.signal ?? request.settings?.signal,
    });
  }

  protected appendTurnToContext(
    context: AiContext,
    response: IChatGenerationResponse,
    toolResults: readonly IAiToolResult[],
  ): void {
    const content: AiContentPart[] = [];
    const messageContent = response.message.content;

    if (typeof messageContent === "string") {
      if (messageContent) {
        content.push({ type: "text", text: messageContent });
      }
    } else {
      for (const part of messageContent) {
        content.push(part);
      }
    }

    for (const toolCall of response.toolCalls ?? []) {
      content.push({
        type: "tool_call",
        id: toolCall.id,
        name: toolCall.name,
        arguments: (toolCall.arguments ?? {}) as Record<string, unknown>,
      });
    }

    context.addMessage({ role: "assistant", content });

    for (const result of toolResults) {
      context.addToolResultMessage(
        result.toolCallId,
        JSON.stringify(result.result ?? result.error),
      );
    }
  }

  protected buildAssistantMessageContent(
    text: string,
    reasoning: string,
  ): IChatMessage["content"] {
    if (!reasoning) {
      return text;
    }

    const content: AiContentPart[] = [
      { type: "thinking", text: reasoning },
    ];

    if (text) {
      content.push({ type: "text", text });
    }

    return content;
  }

  protected async streamResponse(
    request: IChatGenerationRequest,
    state: IAiAgentLoopState,
  ): Promise<IChatGenerationResponse> {
    let responseId: string | undefined;
    let provider = request.provider;
    let model = request.model;
    let text = "";
    let reasoning = "";
    let finishReason: IChatGenerationResponse["finishReason"] | undefined;
    let usage: IChatGenerationResponse["usage"] | undefined;
    let lastMessage: IChatMessage | undefined;
    const toolCalls: NonNullable<IChatGenerationResponse["toolCalls"]> = [];
    const toolResults: NonNullable<IChatGenerationResponse["toolResults"]> = [];

    for await (const chunk of this.generationService.streamChat(request)) {
      await this.onStepChunk(chunk, state);

      responseId ??= chunk.id;
      provider ??= chunk.provider;
      model ??= chunk.model;

      if (chunk.delta) {
        text += chunk.delta;
      }

      if (chunk.reasoningDelta) {
        reasoning += chunk.reasoningDelta;
      }

      if (chunk.toolCall) {
        toolCalls.push(chunk.toolCall);
      }

      if (chunk.toolResult) {
        toolResults.push(chunk.toolResult);
      }

      if (chunk.finishReason) {
        finishReason = chunk.finishReason;
      }

      if (chunk.usage) {
        usage = chunk.usage;
      }

      if (chunk.message) {
        lastMessage = chunk.message;
      }
    }

    return {
      id: responseId ?? crypto.randomUUID(),
      provider: provider ?? "",
      model: model ?? "",
      message:
        lastMessage ??
        ({
          role: "assistant",
          content: this.buildAssistantMessageContent(text, reasoning),
        } satisfies IChatMessage),
      finishReason: finishReason ?? (toolCalls.length > 0 ? "tool_use" : "stop"),
      usage,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      toolResults: toolResults.length > 0 ? toolResults : undefined,
    };
  }

  private async runInternal(
    context: AiContext,
    state: IAiAgentLoopState,
    allToolResults: IAiToolResult[],
  ): Promise<IAiAgentLoopResult> {
    const maxSteps = this.maxSteps();
    let returnDirectResult: unknown;
    let stopped: IAiAgentLoopStopReason = "completed";
    let finalMessage: IChatMessage | undefined;
    let pendingToolCalls: IAiToolCall[] | undefined;
    let resumeState: IAiAgentResumeState | undefined;

    while (true) {
      await this.onStepStart(state);

      const overrides = (await this.onPrepareTurn(state)) ?? undefined;
      const request = this.prepareStepRequest(
        this.buildRequest(overrides, { context }),
      );
      const response = await this.streamResponse(request, state);

      const toolCalls = response.toolCalls ?? [];
      let toolResults: IAiToolResult[] = [...(response.toolResults ?? [])];
      const deferredToolExecution =
        this.toolExecutionMode() === "deferred" && toolCalls.length > 0;

      if (deferredToolExecution) {
        toolResults = [];
        response.toolResults = undefined;
      }

      if (toolCalls.length > 0 && toolResults.length === 0 && deferredToolExecution) {
        this.appendTurnToContext(context, response, []);
      } else if (toolCalls.length > 0 && toolResults.length === 0) {
        const managerResult = await this.runToolCalls(response, request);
        toolResults = managerResult.toolResults;
        response.toolResults = toolResults;
        returnDirectResult = managerResult.returnDirectResult;
      } else if (toolResults.length > 0) {
        const directTool = this.context.tools.find((tool) => tool.returnDirect);
        if (directTool) {
          const directResult = toolResults.find(
            (result) => result.name === directTool.name,
          );
          if (directResult) {
            returnDirectResult = directResult.result ?? directResult.error;
          }
        }
      }

      if (toolCalls.length > 0) {
        this.appendTurnToContext(context, response, toolResults);
      } else {
        context.addMessage(response.message);
      }

      const step: IAiAgentStep = {
        index: state.stepCount,
        request,
        response,
        toolResults,
        done: toolCalls.length === 0,
      };
      state.steps.push(step);
      state.stepCount += 1;
      allToolResults.push(...toolResults);

      await this.onStepEnd(step, state);

      if (deferredToolExecution) {
        stopped = "waitingForToolResults";
        pendingToolCalls = toolCalls;
        resumeState = this.createResumeState(context, state, allToolResults, toolCalls);
        break;
      }

      if (returnDirectResult !== undefined) {
        stopped = "returnDirect";
        break;
      }

      if (step.done) {
        stopped = "completed";
        break;
      }

      if (this.stopWhen(state)) {
        stopped = "stopWhen";
        break;
      }

      if (maxSteps !== undefined && state.stepCount >= maxSteps) {
        stopped = "maxSteps";
        break;
      }
    }

    const lastStep = state.steps[state.steps.length - 1];

    if (stopped === "maxSteps") {
      finalMessage = await this.createMaxStepsFinalMessage(context, state);
    }

    if (!finalMessage && lastStep && lastStep.done) {
      finalMessage = lastStep.response.message;
    }

    const result: IAiAgentLoopResult = {
      steps: state.steps,
      stepCount: state.stepCount,
      finalMessage,
      toolResults: allToolResults,
      pendingToolCalls,
      resumeState,
      returnDirectResult,
      stopped,
    };

    await this.onTurnEnd(result);

    return result;
  }

  async run(): Promise<IAiAgentLoopResult> {
    return this.runInternal(this.context.clone(), { stepCount: 0, steps: [] }, []);
  }

  async resume(
    resumeState: IAiAgentResumeState,
    toolResults: readonly IAiToolResult[],
  ): Promise<IAiAgentLoopResult> {
    const context = new AiContext(resumeState.context);

    for (const result of toolResults) {
      context.addToolResultMessage(
        result.toolCallId,
        JSON.stringify(result.result ?? result.error),
      );
    }

    return this.runInternal(
      context,
      {
        stepCount: resumeState.stepCount,
        steps: [...resumeState.steps],
      },
      [...resumeState.toolResults, ...toolResults],
    );
  }
}

/**
 * Concrete agent loop driven by {@link IAiAgentLoopOptions}. Use directly
 * (like the Vercel AI SDK `streamText` options) or via {@link Agent.run}.
 */
export class AiAgentLoop extends AgentLoop {
  private readonly options: IAiAgentLoopOptions;

  constructor(
    generationService: AiGenerationService,
    context: AiContext,
    options: IAiAgentLoopOptions = {},
  ) {
    const mergedContext = context.clone();

    if (options.tools?.length) {
      mergedContext.addTools(options.tools);
    }

    super(generationService, mergedContext);
    this.options = options;
  }

  protected override onPrepareTurn(
    state: IAiAgentLoopState,
  ): IAiAgentRequestOverrides | void | Promise<IAiAgentRequestOverrides | void> {
    return this.options.onPrepareTurn?.(state);
  }

  protected override onStepStart(state: IAiAgentLoopState): void | Promise<void> {
    return this.options.onStepStart?.(state);
  }

  protected override onStepChunk(
    chunk: IChatGenerationChunk,
    state: IAiAgentLoopState,
  ): void | Promise<void> {
    return this.options.onStepChunk?.(chunk, state);
  }

  protected override onStepEnd(
    step: IAiAgentStep,
    state: IAiAgentLoopState,
  ): void | Promise<void> {
    return this.options.onStepEnd?.(step, state);
  }

  protected override onMaxStepsFinalMessageStart(
    request: IChatGenerationRequest,
    state: IAiAgentLoopState,
  ): void | Promise<void> {
    return this.options.onMaxStepsFinalMessageStart?.(request, state);
  }

  protected override onMaxStepsFinalMessageChunk(
    chunk: IChatGenerationChunk,
    state: IAiAgentLoopState,
  ): void | Promise<void> {
    return this.options.onMaxStepsFinalMessageChunk?.(chunk, state);
  }

  protected override onMaxStepsFinalMessageEnd(
    message: IChatMessage | undefined,
    state: IAiAgentLoopState,
  ): void | Promise<void> {
    return this.options.onMaxStepsFinalMessageEnd?.(message, state);
  }

  protected override onTurnEnd(result: IAiAgentLoopResult): void | Promise<void> {
    return this.options.onTurnEnd?.(result);
  }

  protected override stopWhen(state: IAiAgentLoopState): boolean {
    return this.options.stopWhen?.(state) ?? false;
  }

  protected override maxSteps(): number | undefined {
    return this.options.maxSteps;
  }

  protected override maxStepsFinalMessagePrompt():
    | IAiAgentMaxStepsFinalMessagePrompt
    | false
    | undefined {
    return this.options.maxStepsFinalMessagePrompt ?? super.maxStepsFinalMessagePrompt();
  }

  protected override baseRequestOverrides(): IAiAgentRequestOverrides {
    const overrides: IAiAgentRequestOverrides = {
      ...(this.options.requestOverrides ?? {}),
    };

    if (this.options.signal) {
      overrides.signal = this.options.signal;
    }

    return overrides;
  }

  protected override toolExecutionMode(): IAiAgentToolExecutionMode {
    return this.options.toolExecutionMode ?? super.toolExecutionMode();
  }
}
