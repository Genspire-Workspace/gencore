// file: packages\ai\src\context\ai-context.ts

import type { IChatMessage } from "../chat/chat-message.js";
import type { IChatGenerationRequest } from "../chat/chat-generation-request.js";
import type { IChatGenerationSettings } from "../chat/chat-generation-settings.js";
import type { IAiTool } from "../tools/ai-tool.js";
import type { AiMessageContent } from "../common/ai-content-part.js";
import { normalizeAiMessageContent } from "../common/ai-message-content.js";

export interface IAiContext {
  systemPrompt?: IChatMessage;
  chatMessages: IChatMessage[];
  tools: IAiTool[];
  metadata?: Record<string, unknown>;
}

export class AiContext implements IAiContext {
  systemPrompt?: IChatMessage;
  chatMessages: IChatMessage[];
  tools: IAiTool[];
  metadata?: Record<string, unknown>;

  constructor(input?: Partial<IAiContext>) {
    const messages = [...(input?.chatMessages ?? [])];
    const firstSystemMessage = messages.find(
      (message) => message.role === "system",
    );

    this.systemPrompt = input?.systemPrompt
      ? AiContext.normalizeSystemPrompt(input.systemPrompt)
      : firstSystemMessage
        ? AiContext.normalizeSystemPrompt(firstSystemMessage)
        : undefined;

    this.chatMessages = messages
      .filter((message) => message.role !== "system")
      .map((message) => AiContext.copyMessage(message));

    this.tools = [...(input?.tools ?? [])];
    this.metadata = AiContext.copyMetadata(input?.metadata);
  }

  static create(input?: Partial<IAiContext>): AiContext {
    return new AiContext(input);
  }

  clone(): AiContext {
    return new AiContext(this.toJSON());
  }

  clear(): this {
    this.systemPrompt = undefined;
    this.chatMessages = [];
    this.tools = [];
    this.metadata = undefined;
    return this;
  }

  clearMessages(): this {
    this.chatMessages = [];
    return this;
  }

  clearTools(): this {
    this.tools = [];
    return this;
  }

  setSystemPrompt(prompt: string | IChatMessage | undefined): this {
    this.systemPrompt =
      prompt === undefined ? undefined : AiContext.normalizeSystemPrompt(prompt);
    return this;
  }

  clearSystemPrompt(): this {
    this.systemPrompt = undefined;
    return this;
  }

  addMessage(message: IChatMessage): this {
    if (message.role === "system") {
      this.systemPrompt = AiContext.normalizeSystemPrompt(message);
      return this;
    }

    this.chatMessages.push(AiContext.copyMessage(message));
    return this;
  }

  addMessages(messages: readonly IChatMessage[]): this {
    for (const message of messages) {
      this.addMessage(message);
    }

    return this;
  }

  addUserMessage(
    content: AiMessageContent,
    metadata?: Record<string, unknown>,
  ): this {
    this.chatMessages.push(AiContext.createMessage("user", content, metadata));
    return this;
  }

  addAssistantMessage(
    content: AiMessageContent,
    metadata?: Record<string, unknown>,
  ): this {
    this.chatMessages.push(
      AiContext.createMessage("assistant", content, metadata),
    );
    return this;
  }

  addToolResultMessage(
    toolCallId: string,
    content: AiMessageContent,
    metadata?: Record<string, unknown>,
  ): this {
    this.chatMessages.push(
      AiContext.createToolResultMessage(toolCallId, content, metadata),
    );
    return this;
  }

  addTool(tool: IAiTool): this {
    const existingIndex = this.tools.findIndex(
      (existingTool) => existingTool.name === tool.name,
    );

    if (existingIndex >= 0) {
      this.tools[existingIndex] = tool;
      return this;
    }

    this.tools.push(tool);
    return this;
  }

  addTools(tools: readonly IAiTool[]): this {
    for (const tool of tools) {
      this.addTool(tool);
    }

    return this;
  }

  removeTool(name: string): this {
    this.tools = this.tools.filter((tool) => tool.name !== name);
    return this;
  }

  setTools(tools: readonly IAiTool[]): this {
    this.tools = [...tools];
    return this;
  }

  setMetadata(metadata: Record<string, unknown> | undefined): this {
    this.metadata = AiContext.copyMetadata(metadata);
    return this;
  }

  mergeMetadata(metadata: Record<string, unknown> | undefined): this {
    this.metadata = AiContext.mergeMetadataObjects(this.metadata, metadata);
    return this;
  }

  getMessages(): IChatMessage[] {
    return [
      ...(this.systemPrompt ? [AiContext.copyMessage(this.systemPrompt)] : []),
      ...this.chatMessages.map((message) => AiContext.copyMessage(message)),
    ];
  }

  toChatGenerationRequest(
    input?: Omit<IChatGenerationRequest, "messages" | "tools" | "metadata"> & {
      metadata?: Record<string, unknown>;
      settings?: IChatGenerationSettings;
    },
  ): IChatGenerationRequest {
    const metadata = AiContext.mergeMetadataObjects(this.metadata, input?.metadata);

    return {
      ...input,
      messages: this.getMessages(),
      ...(this.tools.length ? { tools: [...this.tools] } : {}),
      ...(metadata ? { metadata } : {}),
    };
  }

  toJSON(): IAiContext {
    return {
      ...(this.systemPrompt
        ? { systemPrompt: AiContext.copyMessage(this.systemPrompt) }
        : {}),
      chatMessages: this.chatMessages.map((message) =>
        AiContext.copyMessage(message),
      ),
      tools: [...this.tools],
      ...(this.metadata ? { metadata: { ...this.metadata } } : {}),
    };
  }

  private static normalizeSystemPrompt(
    prompt: string | IChatMessage,
  ): IChatMessage {
    if (typeof prompt === "string") {
      return { role: "system", content: prompt };
    }

    return {
      ...AiContext.copyMessage(prompt),
      role: "system",
    };
  }

  private static createMessage(
    role: "user" | "assistant",
    content: string | AiMessageContent,
    metadata?: Record<string, unknown>,
  ): IChatMessage {
    return {
      role,
      content: normalizeAiMessageContent(content),
      ...(metadata ? { metadata: { ...metadata } } : {}),
    };
  }

  private static createToolResultMessage(
    toolCallId: string,
    content: AiMessageContent,
    metadata?: Record<string, unknown>,
  ): IChatMessage {
    return {
      role: "tool",
      content: [
        {
          type: "tool_result",
          toolCallId,
          content,
        },
      ],
      ...(metadata ? { metadata: { ...metadata } } : {}),
    };
  }

  private static copyMessage(message: IChatMessage): IChatMessage {
    return {
      ...message,
      ...(message.metadata ? { metadata: { ...message.metadata } } : {}),
    };
  }

  private static copyMetadata(
    metadata: Record<string, unknown> | undefined,
  ): Record<string, unknown> | undefined {
    return metadata ? { ...metadata } : undefined;
  }

  private static mergeMetadataObjects(
    ...items: Array<Record<string, unknown> | undefined>
  ): Record<string, unknown> | undefined {
    const merged = items.reduce<Record<string, unknown>>((result, item) => {
      if (!item) {
        return result;
      }

      return {
        ...result,
        ...item,
      };
    }, {});

    return Object.keys(merged).length ? merged : undefined;
  }
}
