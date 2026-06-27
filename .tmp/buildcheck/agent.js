// @bun
// packages/ai/src/application/tools/ai-tool-executor.ts
class AiToolExecutor {
  async execute(toolCall, tools, context = {}) {
    const tool = tools.find((candidate) => candidate.name === toolCall.name);
    if (!tool) {
      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        error: `Tool '${toolCall.name}' was not found.`,
        raw: toolCall.raw
      };
    }
    if (!tool.execute) {
      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        error: `Tool '${toolCall.name}' is not executable.`,
        raw: toolCall.raw
      };
    }
    try {
      const result = await tool.execute(toolCall.arguments, {
        ...context,
        toolCallId: toolCall.id,
        toolName: toolCall.name
      });
      const convertedResult = tool.resultConverter ? tool.resultConverter(result) : result;
      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: convertedResult,
        raw: toolCall.raw
      };
    } catch (error) {
      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        error: error instanceof Error ? error.message : String(error),
        raw: toolCall.raw
      };
    }
  }
}

// packages/ai/src/application/tools/ai-tool-calling-manager.ts
class AiToolCallingManager {
  executor;
  constructor(executor = new AiToolExecutor) {
    this.executor = executor;
  }
  async run(input) {
    const toolResults = [];
    for (const toolCall of input.toolCalls) {
      const result = await this.executor.execute(toolCall, input.tools, {
        provider: input.provider,
        model: input.model,
        userId: input.userId,
        metadata: input.metadata,
        signal: input.signal
      });
      toolResults.push(result);
      const tool = input.tools.find((candidate) => candidate.name === toolCall.name);
      if (tool?.returnDirect) {
        return {
          toolResults,
          returnDirectResult: result.result ?? result.error
        };
      }
    }
    return { toolResults };
  }
}

// packages/ai/src/application/agents/agent-loop.ts
class AgentLoop {
  generationService;
  tools;
  constructor(generationService, tools = []) {
    this.generationService = generationService;
    this.tools = tools;
  }
  onStepStart(_state) {}
  onPrepareTurn(_state) {
    return;
  }
  onStepEnd(_step, _state) {}
  onTurnEnd(_result) {}
  stopWhen(_state) {
    return false;
  }
  maxSteps() {
    return;
  }
  baseRequestOverrides() {
    return {};
  }
  buildRequest(context, overrides) {
    const merged = {
      ...this.baseRequestOverrides(),
      ...overrides
    };
    return context.toChatGenerationRequest({
      ...merged,
      settings: { maxToolSteps: 1, ...merged.settings }
    });
  }
  runToolCalls(response, request) {
    const manager = new AiToolCallingManager;
    return manager.run({
      toolCalls: response.toolCalls ?? [],
      tools: this.tools,
      provider: request.provider,
      model: request.model,
      userId: request.userId,
      metadata: request.metadata,
      signal: request.signal ?? request.settings?.signal
    });
  }
  appendTurnToContext(context, response, toolResults) {
    const content = [];
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
        arguments: toolCall.arguments ?? {}
      });
    }
    context.addMessage({ role: "assistant", content });
    for (const result of toolResults) {
      context.addToolResultMessage(result.toolCallId, JSON.stringify(result.result ?? result.error));
    }
  }
  async run(context) {
    const state = { stepCount: 0, steps: [] };
    const allToolResults = [];
    const maxSteps = this.maxSteps();
    let returnDirectResult;
    let stopped = "completed";
    while (true) {
      await this.onStepStart(state);
      const overrides = await this.onPrepareTurn(state) ?? undefined;
      const request = this.buildRequest(context, overrides);
      const response = await this.generationService.generateChat(request);
      const toolCalls = response.toolCalls ?? [];
      let toolResults = [];
      if (toolCalls.length > 0) {
        const managerResult = await this.runToolCalls(response, request);
        toolResults = managerResult.toolResults;
        returnDirectResult = managerResult.returnDirectResult;
        this.appendTurnToContext(context, response, toolResults);
      } else {
        context.addMessage(response.message);
      }
      const step = {
        index: state.stepCount,
        request,
        response,
        toolResults,
        done: toolCalls.length === 0
      };
      state.steps.push(step);
      state.stepCount += 1;
      allToolResults.push(...toolResults);
      await this.onStepEnd(step, state);
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
    const finalMessage = lastStep && lastStep.done ? lastStep.response.message : undefined;
    const result = {
      steps: state.steps,
      stepCount: state.stepCount,
      finalMessage,
      toolResults: allToolResults,
      returnDirectResult,
      stopped
    };
    await this.onTurnEnd(result);
    return result;
  }
}

class AiAgentLoop extends AgentLoop {
  options;
  constructor(generationService, options = {}) {
    super(generationService, options.tools ?? []);
    this.options = options;
  }
  onPrepareTurn(state) {
    return this.options.onPrepareTurn?.(state);
  }
  onStepStart(state) {
    return this.options.onStepStart?.(state);
  }
  onStepEnd(step, state) {
    return this.options.onStepEnd?.(step, state);
  }
  onTurnEnd(result) {
    return this.options.onTurnEnd?.(result);
  }
  stopWhen(state) {
    return this.options.stopWhen?.(state) ?? false;
  }
  maxSteps() {
    return this.options.maxSteps;
  }
  baseRequestOverrides() {
    const overrides = {
      ...this.options.requestOverrides ?? {}
    };
    if (this.options.signal) {
      overrides.signal = this.options.signal;
    }
    return overrides;
  }
}

// packages/ai/src/application/agents/agent.ts
class Agent {
  generationService;
  tools;
  constructor(generationService, tools = []) {
    this.generationService = generationService;
    this.tools = tools;
  }
  loop(options = {}) {
    return new AiAgentLoop(this.generationService, {
      tools: this.tools,
      ...options
    });
  }
  async run(context, options = {}) {
    return this.loop(options).run(context);
  }
}
export {
  Agent
};
