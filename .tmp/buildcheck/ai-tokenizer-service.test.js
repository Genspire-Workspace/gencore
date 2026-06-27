// @bun
// packages/ai/src/application/services/ai-tokenizer-service.test.ts
import { describe, expect, test } from "bun:test";

// packages/ai/src/domain/messages/ai-message-content.ts
function createTextAiMessageContent(text) {
  return [
    {
      type: "text",
      text
    }
  ];
}
function normalizeAiMessageContent(content) {
  if (typeof content === "string") {
    return createTextAiMessageContent(content);
  }
  return content.map((part) => ({ ...part }));
}

// packages/ai/src/application/context/ai-context.ts
class AiContext {
  systemPrompt;
  chatMessages;
  tools;
  metadata;
  constructor(input) {
    const messages = [...input?.chatMessages ?? []];
    const firstSystemMessage = messages.find((message) => message.role === "system");
    this.systemPrompt = input?.systemPrompt ? AiContext.normalizeSystemPrompt(input.systemPrompt) : firstSystemMessage ? AiContext.normalizeSystemPrompt(firstSystemMessage) : undefined;
    this.chatMessages = messages.filter((message) => message.role !== "system").map((message) => AiContext.copyMessage(message));
    this.tools = [...input?.tools ?? []];
    this.metadata = AiContext.copyMetadata(input?.metadata);
  }
  static create(input) {
    return new AiContext(input);
  }
  clone() {
    return new AiContext(this.toJSON());
  }
  clear() {
    this.systemPrompt = undefined;
    this.chatMessages = [];
    this.tools = [];
    this.metadata = undefined;
    return this;
  }
  clearMessages() {
    this.chatMessages = [];
    return this;
  }
  clearTools() {
    this.tools = [];
    return this;
  }
  setSystemPrompt(prompt) {
    this.systemPrompt = prompt === undefined ? undefined : AiContext.normalizeSystemPrompt(prompt);
    return this;
  }
  clearSystemPrompt() {
    this.systemPrompt = undefined;
    return this;
  }
  addMessage(message) {
    if (message.role === "system") {
      this.systemPrompt = AiContext.normalizeSystemPrompt(message);
      return this;
    }
    this.chatMessages.push(AiContext.copyMessage(message));
    return this;
  }
  addMessages(messages) {
    for (const message of messages) {
      this.addMessage(message);
    }
    return this;
  }
  addUserMessage(content, metadata) {
    this.chatMessages.push(AiContext.createMessage("user", content, metadata));
    return this;
  }
  addAssistantMessage(content, metadata) {
    this.chatMessages.push(AiContext.createMessage("assistant", content, metadata));
    return this;
  }
  addToolResultMessage(toolCallId, content, metadata) {
    this.chatMessages.push(AiContext.createToolResultMessage(toolCallId, content, metadata));
    return this;
  }
  addTool(tool) {
    const existingIndex = this.tools.findIndex((existingTool) => existingTool.name === tool.name);
    if (existingIndex >= 0) {
      this.tools[existingIndex] = tool;
      return this;
    }
    this.tools.push(tool);
    return this;
  }
  addTools(tools) {
    for (const tool of tools) {
      this.addTool(tool);
    }
    return this;
  }
  removeTool(name) {
    this.tools = this.tools.filter((tool) => tool.name !== name);
    return this;
  }
  setTools(tools) {
    this.tools = [...tools];
    return this;
  }
  setMetadata(metadata) {
    this.metadata = AiContext.copyMetadata(metadata);
    return this;
  }
  mergeMetadata(metadata) {
    this.metadata = AiContext.mergeMetadataObjects(this.metadata, metadata);
    return this;
  }
  getMessages() {
    return [
      ...this.systemPrompt ? [AiContext.copyMessage(this.systemPrompt)] : [],
      ...this.chatMessages.map((message) => AiContext.copyMessage(message))
    ];
  }
  toChatGenerationRequest(input) {
    const metadata = AiContext.mergeMetadataObjects(this.metadata, input?.metadata);
    return {
      ...input,
      messages: this.getMessages(),
      ...this.tools.length ? { tools: [...this.tools] } : {},
      ...metadata ? { metadata } : {}
    };
  }
  toJSON() {
    return {
      ...this.systemPrompt ? { systemPrompt: AiContext.copyMessage(this.systemPrompt) } : {},
      chatMessages: this.chatMessages.map((message) => AiContext.copyMessage(message)),
      tools: [...this.tools],
      ...this.metadata ? { metadata: { ...this.metadata } } : {}
    };
  }
  static normalizeSystemPrompt(prompt) {
    if (typeof prompt === "string") {
      return { role: "system", content: prompt };
    }
    return {
      ...AiContext.copyMessage(prompt),
      role: "system"
    };
  }
  static createMessage(role, content, metadata) {
    return {
      role,
      content: normalizeAiMessageContent(content),
      ...metadata ? { metadata: { ...metadata } } : {}
    };
  }
  static createToolResultMessage(toolCallId, content, metadata) {
    return {
      role: "tool",
      content: [
        {
          type: "tool_result",
          toolCallId,
          content
        }
      ],
      ...metadata ? { metadata: { ...metadata } } : {}
    };
  }
  static copyMessage(message) {
    return {
      ...message,
      ...message.metadata ? { metadata: { ...message.metadata } } : {}
    };
  }
  static copyMetadata(metadata) {
    return metadata ? { ...metadata } : undefined;
  }
  static mergeMetadataObjects(...items) {
    const merged = items.reduce((result, item) => {
      if (!item) {
        return result;
      }
      return {
        ...result,
        ...item
      };
    }, {});
    return Object.keys(merged).length ? merged : undefined;
  }
}

// packages/ai/src/application/services/ai-tokenizer-service.ts
import {
  encodingForModel,
  getEncoding
} from "js-tiktoken";
var DEFAULT_ENCODING = "cl100k_base";

class AiTokenizerService {
  countTokens(input, options) {
    const resolved = this.resolveTokenizer(options);
    const text = this.resolveInputToText(input);
    const tokens = resolved.encoding.encode(text);
    return {
      encoding: resolved.encodingName,
      tokenCount: tokens.length
    };
  }
  chunkText(text, options) {
    const maxTokens = Math.max(1, Math.floor(options.maxTokens));
    const overlapTokens = Math.max(0, Math.min(maxTokens - 1, Math.floor(options.overlapTokens ?? 0)));
    const resolved = this.resolveTokenizer(options);
    const tokens = resolved.encoding.encode(text);
    if (tokens.length === 0) {
      return {
        encoding: resolved.encodingName,
        tokenCount: 0,
        chunkCount: 0,
        chunks: []
      };
    }
    const chunks = [];
    let startToken = 0;
    let index = 0;
    while (startToken < tokens.length) {
      const endToken = Math.min(tokens.length, startToken + maxTokens);
      const slice = tokens.slice(startToken, endToken);
      chunks.push({
        index,
        text: this.decodeTokens(resolved.encoding, slice),
        tokenCount: slice.length,
        startToken,
        endToken
      });
      if (endToken >= tokens.length) {
        break;
      }
      startToken = Math.max(startToken + 1, endToken - overlapTokens);
      index += 1;
    }
    return {
      encoding: resolved.encodingName,
      tokenCount: tokens.length,
      chunkCount: chunks.length,
      chunks
    };
  }
  chunkInput(input, options) {
    return this.chunkText(this.resolveInputToText(input), options);
  }
  resolveInputToText(input) {
    if (typeof input === "string") {
      return input;
    }
    const parts = [];
    if (input.systemPrompt) {
      parts.push(this.serializeMessage(input.systemPrompt));
    }
    for (const message of input.chatMessages) {
      parts.push(this.serializeMessage(message));
    }
    return parts.join(`
`);
  }
  serializeMessage(message) {
    return this.serializeMessageContent(message.content);
  }
  serializeMessageContent(content) {
    if (typeof content === "string") {
      return content;
    }
    return content.map((part) => this.serializePart(part)).filter((value) => value.length > 0).join(" ");
  }
  serializePart(part) {
    switch (part.type) {
      case "text":
        return part.text;
      case "thinking":
        return part.redacted ? "[redacted thinking]" : part.text;
      case "tool_call": {
        const args = JSON.stringify(part.arguments ?? {});
        return `${part.name}(${args})`;
      }
      case "tool_result":
        return this.serializeMessageContent(part.content);
      case "image":
        return "[image]";
      default:
        return "";
    }
  }
  resolveTokenizer(options) {
    const model = this.resolveModelName(options);
    if (model) {
      try {
        return {
          encodingName: `model:${model}`,
          encoding: encodingForModel(model)
        };
      } catch {}
    }
    return {
      encodingName: DEFAULT_ENCODING,
      encoding: getEncoding(DEFAULT_ENCODING)
    };
  }
  resolveModelName(options) {
    const directModel = options?.model?.trim();
    if (directModel) {
      return directModel;
    }
    const providerSelection = options?.providerSelection?.trim();
    if (!providerSelection) {
      return;
    }
    const separatorIndex = providerSelection.indexOf(":");
    if (separatorIndex < 0) {
      return;
    }
    const model = providerSelection.slice(separatorIndex + 1).trim();
    return model || undefined;
  }
  decodeTokens(encoding, tokens) {
    return encoding.decode(tokens);
  }
}

// packages/ai/src/application/services/ai-tokenizer-service.test.ts
describe("AiTokenizerService", () => {
  const service = new AiTokenizerService;
  const sampleText = "The quick brown fox jumps over the lazy dog. ".repeat(20);
  test("counts tokens for a plain string using the default encoding", () => {
    const result = service.countTokens("hello world");
    expect(result.encoding).toBe("cl100k_base");
    expect(result.tokenCount).toBeGreaterThan(0);
  });
  test("resolves a known model to a model-scoped encoding", () => {
    const result = service.countTokens("hello world", { model: "gpt-4" });
    expect(result.encoding).toBe("model:gpt-4");
    expect(result.tokenCount).toBeGreaterThan(0);
  });
  test("falls back to the default encoding for unknown models", () => {
    const result = service.countTokens("hello world", {
      model: "some-unregistered-local-model"
    });
    expect(result.encoding).toBe("cl100k_base");
    expect(result.tokenCount).toBeGreaterThan(0);
  });
  test("extracts a model from a provider selection string", () => {
    const result = service.countTokens("hello world", {
      providerSelection: "ollama:gemma4:12b"
    });
    expect(result.encoding).toBe("model:gemma4:12b");
    expect(result.tokenCount).toBeGreaterThan(0);
  });
  test("counts tokens for an AiContext with a system prompt and messages", () => {
    const empty = service.countTokens(new AiContext);
    const context = AiContext.create().setSystemPrompt("You are a helpful assistant.").addUserMessage("Summarize this text.");
    const result = service.countTokens(context);
    expect(result.tokenCount).toBeGreaterThan(empty.tokenCount);
  });
  test("returns a single chunk when maxTokens covers the whole input", () => {
    const total = service.countTokens(sampleText).tokenCount;
    const result = service.chunkText(sampleText, { maxTokens: total });
    expect(result.chunkCount).toBe(1);
    expect(result.tokenCount).toBe(total);
    expect(result.chunks[0].tokenCount).toBe(total);
  });
  test("splits text into bounded chunks", () => {
    const total = service.countTokens(sampleText).tokenCount;
    const half = Math.max(1, Math.ceil(total / 2));
    const result = service.chunkText(sampleText, { maxTokens: half });
    expect(result.chunkCount).toBeGreaterThanOrEqual(2);
    for (const chunk of result.chunks) {
      expect(chunk.tokenCount).toBeLessThanOrEqual(half);
    }
    expect(result.tokenCount).toBe(total);
  });
  test("applies overlap between chunks", () => {
    const total = service.countTokens(sampleText).tokenCount;
    const maxTokens = Math.max(2, Math.ceil(total / 4));
    const result = service.chunkText(sampleText, {
      maxTokens,
      overlapTokens: Math.max(1, Math.floor(maxTokens / 2))
    });
    expect(result.chunkCount).toBeGreaterThanOrEqual(2);
    const overlapping = result.chunks.filter((chunk, i) => i > 0 && chunk.startToken < result.chunks[i - 1].endToken);
    expect(overlapping.length).toBeGreaterThan(0);
  });
  test("handles empty input", () => {
    expect(service.countTokens("").tokenCount).toBe(0);
    const chunked = service.chunkText("", { maxTokens: 8 });
    expect(chunked.chunkCount).toBe(0);
    expect(chunked.tokenCount).toBe(0);
    expect(chunked.chunks).toHaveLength(0);
  });
  test("chunkInput mirrors chunkText for AiContext input", () => {
    const context = AiContext.create().addUserMessage(sampleText);
    const direct = service.chunkText(sampleText, { maxTokens: 16 });
    const fromContext = service.chunkInput(context, { maxTokens: 16 });
    expect(fromContext.tokenCount).toBe(direct.tokenCount);
    expect(fromContext.chunkCount).toBe(direct.chunkCount);
  });
});
