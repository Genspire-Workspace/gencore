import { describe, expect, test } from "bun:test";
import { AiContext } from "./ai-context.js";
import type { IAiTool } from "../tools/ai-tool.js";

const createTool = (name: string): IAiTool => ({
  name,
  description: `Tool ${name}`,
});

describe("AiContext", () => {
  test("creates empty context", () => {
    const context = new AiContext();

    expect(context.systemPrompt).toBeUndefined();
    expect(context.chatMessages).toEqual([]);
    expect(context.tools).toEqual([]);
    expect(context.metadata).toBeUndefined();
  });

  test("constructor copies input arrays", () => {
    const chatMessages = [{ role: "user", content: "Hello" }] as const;
    const tools = [createTool("get_capital")];
    const context = new AiContext({
      chatMessages: [...chatMessages],
      tools,
    });

    const originalMessage = chatMessages[0];

    tools.push(createTool("add_numbers"));
    (tools[0] as IAiTool).name = "changed";
    (originalMessage as { metadata?: Record<string, unknown> }).metadata = {
      changed: true,
    };

    expect(context.chatMessages).toHaveLength(1);
    expect(context.chatMessages[0]?.role).toBe("user");
    expect(context.tools).toHaveLength(1);
    expect(context.tools[0]?.name).toBe("changed");
  });

  test("constructor promotes system message from chatMessages", () => {
    const context = new AiContext({
      chatMessages: [
        { role: "system", content: "System" },
        { role: "user", content: "Hello" },
      ],
    });

    expect(context.systemPrompt?.role).toBe("system");
    expect(context.systemPrompt?.content).toBe("System");
    expect(context.chatMessages).toHaveLength(1);
    expect(context.chatMessages[0]?.role).toBe("user");
  });

  test("setSystemPrompt from string", () => {
    const context = new AiContext().setSystemPrompt("System");

    expect(context.systemPrompt).toEqual({
      role: "system",
      content: "System",
    });
  });

  test("setSystemPrompt from wrong-role message", () => {
    const context = new AiContext();

    context.setSystemPrompt({
      role: "user",
      content: "You are system now.",
    });

    expect(context.systemPrompt?.role).toBe("system");
    expect(context.systemPrompt?.content).toBe("You are system now.");
  });

  test("addMessage with system role sets system prompt", () => {
    const context = new AiContext().addMessage({
      role: "system",
      content: "System",
    });

    expect(context.systemPrompt?.content).toBe("System");
    expect(context.chatMessages).toEqual([]);
  });

  test("addUserMessage", () => {
    const context = new AiContext().addUserMessage("Hello");

    expect(context.chatMessages).toHaveLength(1);
    expect(context.chatMessages[0]?.role).toBe("user");
    expect(context.chatMessages[0]?.content).toEqual([
      {
        type: "text",
        text: "Hello",
      },
    ]);
  });

  test("addAssistantMessage", () => {
    const context = new AiContext().addAssistantMessage("Hi");

    expect(context.chatMessages).toHaveLength(1);
    expect(context.chatMessages[0]?.role).toBe("assistant");
    expect(context.chatMessages[0]?.content).toEqual([
      {
        type: "text",
        text: "Hi",
      },
    ]);
  });

  test("addToolResultMessage", () => {
    const context = new AiContext().addToolResultMessage("call-1", "Lisbon");

    expect(context.chatMessages).toHaveLength(1);
    expect(context.chatMessages[0]?.role).toBe("tool");
    expect(context.chatMessages[0]?.content).toEqual([
      {
        type: "tool_result",
        toolCallId: "call-1",
        content: "Lisbon",
      },
    ]);
  });

  test("addTool appends", () => {
    const context = new AiContext().addTool(createTool("get_capital"));

    expect(context.tools).toHaveLength(1);
    expect(context.tools[0]?.name).toBe("get_capital");
  });

  test("addTool with duplicate name replaces", () => {
    const context = new AiContext()
      .addTool(createTool("get_capital"))
      .addTool({
        name: "get_capital",
        description: "Replacement",
      });

    expect(context.tools).toHaveLength(1);
    expect(context.tools[0]?.description).toBe("Replacement");
  });

  test("addTools upserts each tool", () => {
    const context = new AiContext()
      .addTool(createTool("get_capital"))
      .addTools([
        {
          name: "get_capital",
          description: "Replacement",
        },
        createTool("add_numbers"),
      ]);

    expect(context.tools).toHaveLength(2);
    expect(context.tools[0]?.description).toBe("Replacement");
    expect(context.tools[1]?.name).toBe("add_numbers");
  });

  test("removeTool removes by name", () => {
    const context = new AiContext()
      .addTool(createTool("get_capital"))
      .addTool(createTool("add_numbers"))
      .removeTool("get_capital");

    expect(context.tools).toHaveLength(1);
    expect(context.tools[0]?.name).toBe("add_numbers");
  });

  test("setTools replaces tools", () => {
    const context = new AiContext()
      .addTool(createTool("get_capital"))
      .setTools([createTool("add_numbers")]);

    expect(context.tools).toHaveLength(1);
    expect(context.tools[0]?.name).toBe("add_numbers");
  });

  test("setMetadata copies metadata", () => {
    const metadata = { a: 1 };
    const context = new AiContext().setMetadata(metadata);

    metadata.a = 2;

    expect(context.metadata).toEqual({ a: 1 });
  });

  test("mergeMetadata later values win", () => {
    const context = new AiContext()
      .mergeMetadata({ a: 1, b: 1 })
      .mergeMetadata({ b: 2, c: 3 });

    expect(context.metadata).toEqual({ a: 1, b: 2, c: 3 });
  });

  test("getMessages returns system first", () => {
    const context = new AiContext()
      .setSystemPrompt("System")
      .addUserMessage("Hello");

    expect(context.getMessages()).toEqual([
      { role: "system", content: "System" },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Hello",
          },
        ],
      },
    ]);
  });

  test("toChatGenerationRequest includes messages, tools, metadata, model, provider, settings", () => {
    const context = new AiContext()
      .setSystemPrompt("System")
      .addUserMessage("Hello")
      .addTool({
        name: "get_capital",
        description: "Gets capital",
      })
      .mergeMetadata({ a: 1 });

    const request = context.toChatGenerationRequest({
      provider: "deepseek",
      model: "deepseek-chat",
      metadata: { b: 2 },
      settings: { reasoningEffort: "none" },
    });

    expect(request.provider).toBe("deepseek");
    expect(request.model).toBe("deepseek-chat");
    expect(request.messages).toHaveLength(2);
    expect(request.messages[0]?.role).toBe("system");
    expect(request.messages[1]?.role).toBe("user");
    expect(request.messages[1]?.content).toEqual([
      {
        type: "text",
        text: "Hello",
      },
    ]);
    expect(request.tools).toHaveLength(1);
    expect(request.metadata).toEqual({ a: 1, b: 2 });
    expect(request.settings?.reasoningEffort).toBe("none");
  });

  test("toChatGenerationRequest omits tools if none", () => {
    const request = new AiContext()
      .addUserMessage("Hello")
      .toChatGenerationRequest();

    expect(request.tools).toBeUndefined();
  });

  test("clone does not share arrays", () => {
    const original = new AiContext()
      .setSystemPrompt("System")
      .addUserMessage("Hello")
      .addTool(createTool("get_capital"))
      .setMetadata({ a: 1 });
    const clone = original.clone();

    clone.addAssistantMessage("Hi").addTool(createTool("add_numbers"));

    expect(original.chatMessages).toHaveLength(1);
    expect(original.tools).toHaveLength(1);
    expect(clone.chatMessages).toHaveLength(2);
    expect(clone.tools).toHaveLength(2);
  });

  test("clearMessages keeps system prompt and tools", () => {
    const context = new AiContext()
      .setSystemPrompt("System")
      .addUserMessage("Hello")
      .addTool(createTool("get_capital"))
      .setMetadata({ a: 1 })
      .clearMessages();

    expect(context.systemPrompt?.content).toBe("System");
    expect(context.chatMessages).toEqual([]);
    expect(context.tools).toHaveLength(1);
    expect(context.metadata).toEqual({ a: 1 });
  });

  test("clearTools keeps system prompt and messages", () => {
    const context = new AiContext()
      .setSystemPrompt("System")
      .addUserMessage("Hello")
      .addTool(createTool("get_capital"))
      .setMetadata({ a: 1 })
      .clearTools();

    expect(context.systemPrompt?.content).toBe("System");
    expect(context.chatMessages).toHaveLength(1);
    expect(context.tools).toEqual([]);
    expect(context.metadata).toEqual({ a: 1 });
  });

  test("clearSystemPrompt clears only system prompt", () => {
    const context = new AiContext()
      .setSystemPrompt("System")
      .addUserMessage("Hello")
      .addTool(createTool("get_capital"))
      .setMetadata({ a: 1 })
      .clearSystemPrompt();

    expect(context.systemPrompt).toBeUndefined();
    expect(context.chatMessages).toHaveLength(1);
    expect(context.tools).toHaveLength(1);
    expect(context.metadata).toEqual({ a: 1 });
  });

  test("clear clears everything", () => {
    const context = new AiContext()
      .setSystemPrompt("System")
      .addUserMessage("Hello")
      .addTool(createTool("get_capital"))
      .setMetadata({ a: 1 })
      .clear();

    expect(context.systemPrompt).toBeUndefined();
    expect(context.chatMessages).toEqual([]);
    expect(context.tools).toEqual([]);
    expect(context.metadata).toBeUndefined();
  });
});
