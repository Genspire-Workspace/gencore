// file: packages/ai/src/domain/context/ai-context.test.ts

import { describe, expect, test } from "bun:test";
import {
  AiContext,
  type IAiContext,
} from "./ai-context.js";

import type { IAiTool } from "../tools/index.js";
import type { IChatGenerationRequest, IChatMessage } from "../index.js";

describe("AiContext", () => {
  test("creates empty context", () => {
    const context = AiContext.create();

    expect(context.systemPrompt).toBeUndefined();
    expect(context.chatMessages).toEqual([]);
    expect(context.tools).toEqual([]);
    expect(context.metadata).toBeUndefined();
    expect(context.getMessages()).toEqual([]);
  });

  test("constructor copies input arrays", () => {
    const tool: IAiTool = { name: "echo", description: "Echo" };
    const messages: IChatMessage[] = [{ role: "user", content: "Hi" }];
    const tools: IAiTool[] = [tool];

    const context = new AiContext({
      chatMessages: messages,
      tools,
      metadata: { source: "test" },
    });

    messages.push({ role: "assistant", content: "Later" });
    tools.push({ name: "later", description: "Later" });

    expect(context.chatMessages).toHaveLength(1);
    expect(context.tools).toHaveLength(1);
    expect(context.metadata).toEqual({ source: "test" });
  });

  test("constructor promotes system message from chatMessages", () => {
    const context = new AiContext({
      chatMessages: [
        { role: "system", content: "Be concise" },
        { role: "user", content: "Hello" },
      ],
    });

    expect(context.systemPrompt).toEqual({
      role: "system",
      content: "Be concise",
    });
    expect(context.chatMessages).toEqual([{ role: "user", content: "Hello" }]);
  });

  test("setSystemPrompt from string", () => {
    const context = AiContext.create();

    context.setSystemPrompt("You are helpful.");

    expect(context.systemPrompt).toEqual({
      role: "system",
      content: "You are helpful.",
    });
  });

  test("setSystemPrompt from wrong-role message", () => {
    const context = AiContext.create();

    context.setSystemPrompt({ role: "assistant", content: "Nope" });

    expect(context.systemPrompt).toEqual({
      role: "system",
      content: "Nope",
    });
  });

  test("addMessage with system role sets system prompt", () => {
    const context = AiContext.create();

    context.addMessage({ role: "system", content: "Rules" });

    expect(context.systemPrompt?.content).toBe("Rules");
    expect(context.chatMessages).toEqual([]);
  });

  test("addUserMessage", () => {
    const context = AiContext.create();

    context.addUserMessage("Hello");

    expect(context.chatMessages).toEqual([
      {
        role: "user",
        content: [{ type: "text", text: "Hello" }],
      },
    ]);
  });

  test("addAssistantMessage", () => {
    const context = AiContext.create();

    context.addAssistantMessage("Hi");

    expect(context.chatMessages).toEqual([
      {
        role: "assistant",
        content: [{ type: "text", text: "Hi" }],
      },
    ]);
  });

  test("addToolResultMessage", () => {
    const context = AiContext.create();

    context.addToolResultMessage(
      "call-1",
      JSON.stringify({ ok: true }),
    );

    expect(context.chatMessages).toEqual([
      {
        role: "tool",
        content: [
          {
            type: "tool_result",
            toolCallId: "call-1",
            content: '{"ok":true}',
          },
        ],
      },
    ]);
  });

  test("addTool appends", () => {
    const context = AiContext.create();

    context.addTool({ name: "one", description: "One" });

    expect(context.tools).toEqual([{ name: "one", description: "One" }]);
  });

  test("addTool with duplicate name replaces", () => {
    const context = AiContext.create();
    context.addTool({ name: "dup", description: "Old" });

    context.addTool({ name: "dup", description: "New" });

    expect(context.tools).toEqual([{ name: "dup", description: "New" }]);
  });

  test("addTools upserts each tool", () => {
    const context = AiContext.create();
    context.addTool({ name: "one", description: "One" });

    context.addTools([
      { name: "one", description: "One updated" },
      { name: "two", description: "Two" },
    ]);

    expect(context.tools).toEqual([
      { name: "one", description: "One updated" },
      { name: "two", description: "Two" },
    ]);
  });

  test("removeTool removes by name", () => {
    const context = AiContext.create();
    context.addTools([
      { name: "one", description: "One" },
      { name: "two", description: "Two" },
    ]);

    context.removeTool("one");

    expect(context.tools).toEqual([{ name: "two", description: "Two" }]);
  });

  test("setTools replaces tools", () => {
    const context = AiContext.create();
    context.addTool({ name: "old", description: "Old" });

    context.setTools([{ name: "new", description: "New" }]);

    expect(context.tools).toEqual([{ name: "new", description: "New" }]);
  });

  test("setMetadata copies metadata", () => {
    const metadata = { a: 1 };
    const context = AiContext.create();

    context.setMetadata(metadata);
    metadata.a = 2;

    expect(context.metadata).toEqual({ a: 1 });
  });

  test("mergeMetadata later values win", () => {
    const context = AiContext.create();
    context.setMetadata({ a: 1, b: 1 });

    context.mergeMetadata({ b: 2, c: 3 });

    expect(context.metadata).toEqual({ a: 1, b: 2, c: 3 });
  });

  test("getMessages returns system first", () => {
    const context = AiContext.create();
    context.setSystemPrompt("System");
    context.addUserMessage("User");

    expect(context.getMessages()).toEqual([
      { role: "system", content: "System" },
      {
        role: "user",
        content: [{ type: "text", text: "User" }],
      },
    ]);
  });

  test("toChatGenerationRequest includes messages, tools, metadata, model, provider, settings", () => {
    const context = new AiContext({
      systemPrompt: { role: "system", content: "Rules" },
      chatMessages: [{ role: "user", content: "Hello" }],
      tools: [{ name: "echo", description: "Echo" }],
      metadata: { traceId: "123" },
    });

    const request = context.toChatGenerationRequest({
      model: "test-model",
      provider: "test-provider",
      settings: { temperature: 0.2 },
    });

    expect(request).toEqual<IChatGenerationRequest>({
      model: "test-model",
      provider: "test-provider",
      settings: { temperature: 0.2 },
      metadata: { traceId: "123" },
      messages: [
        { role: "system", content: "Rules" },
        { role: "user", content: "Hello" },
      ],
      tools: [{ name: "echo", description: "Echo" }],
    });
  });

  test("toChatGenerationRequest omits tools if none", () => {
    const context = new AiContext({
      chatMessages: [{ role: "user", content: "Hello" }],
    });

    const request = context.toChatGenerationRequest({ model: "test-model" });

    expect(request.tools).toBeUndefined();
  });

  test("clone does not share arrays", () => {
    const context = new AiContext({
      systemPrompt: { role: "system", content: "Rules" },
      chatMessages: [{ role: "user", content: "Hello" }],
      tools: [{ name: "echo", description: "Echo" }],
      metadata: { traceId: "123" },
    });

    const clone = context.clone();
    clone.addUserMessage("More");
    clone.addTool({ name: "other", description: "Other" });
    clone.mergeMetadata({ extra: true });

    expect(context.chatMessages).toHaveLength(1);
    expect(context.tools).toHaveLength(1);
    expect(context.metadata).toEqual({ traceId: "123" });
  });

  test("clearMessages keeps system prompt and tools", () => {
    const context = new AiContext({
      systemPrompt: { role: "system", content: "Rules" },
      chatMessages: [{ role: "user", content: "Hello" }],
      tools: [{ name: "echo", description: "Echo" }],
      metadata: { traceId: "123" },
    });

    context.clearMessages();

    expect(context.systemPrompt).toEqual({ role: "system", content: "Rules" });
    expect(context.chatMessages).toEqual([]);
    expect(context.tools).toEqual([{ name: "echo", description: "Echo" }]);
  });

  test("clearTools keeps system prompt and messages", () => {
    const context = new AiContext({
      systemPrompt: { role: "system", content: "Rules" },
      chatMessages: [{ role: "user", content: "Hello" }],
      tools: [{ name: "echo", description: "Echo" }],
      metadata: { traceId: "123" },
    });

    context.clearTools();

    expect(context.systemPrompt).toEqual({ role: "system", content: "Rules" });
    expect(context.chatMessages).toEqual([{ role: "user", content: "Hello" }]);
    expect(context.tools).toEqual([]);
  });

  test("clearSystemPrompt clears only system prompt", () => {
    const context = new AiContext({
      systemPrompt: { role: "system", content: "Rules" },
      chatMessages: [{ role: "user", content: "Hello" }],
      tools: [{ name: "echo", description: "Echo" }],
    });

    context.clearSystemPrompt();

    expect(context.systemPrompt).toBeUndefined();
    expect(context.chatMessages).toEqual([{ role: "user", content: "Hello" }]);
    expect(context.tools).toEqual([{ name: "echo", description: "Echo" }]);
  });

  test("clear clears everything", () => {
    const context = new AiContext({
      systemPrompt: { role: "system", content: "Rules" },
      chatMessages: [{ role: "user", content: "Hello" }],
      tools: [{ name: "echo", description: "Echo" }],
      metadata: { traceId: "123" },
    });

    context.clear();

    expect(context.systemPrompt).toBeUndefined();
    expect(context.chatMessages).toEqual([]);
    expect(context.tools).toEqual([]);
    expect(context.metadata).toBeUndefined();
  });
});
