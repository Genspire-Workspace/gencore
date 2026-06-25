// file: packages\ai\src\providers\anthropic-compatible\anthropic-compatible-provider.test.ts

import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { anthropicCompatibleProvider } from "./anthropic-compatible-provider.js";
import type { IAiRuntimeProvider } from "../runtime/ai-runtime-provider.js";

type FetchMock = ReturnType<typeof mock>;

function setFetch(fn: (...args: any[]) => any): FetchMock {
  const m = mock(fn);
  (globalThis as any).fetch = m;
  return m;
}

function mockFetchJson(body: unknown, status = 200): FetchMock {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
  return setFetch(async () => response);
}

describe("Anthropic-compatible chat", () => {
  let provider: IAiRuntimeProvider;
  let fetchMock: FetchMock;

  beforeEach(() => {
    setFetch(async () => new Response("{}"));
    provider = anthropicCompatibleProvider({
      id: "test-anthropic",
      displayName: "Test Anthropic",
      baseUrl: "https://api.example.com",
      apiKey: "sk-ant-test",
      defaultChatModel: "claude-model",
    });
  });

  afterEach(() => {
    ((globalThis as any).fetch as FetchMock).mockClear();
  });

  test("sends correct /messages request", async () => {
    fetchMock = mockFetchJson({
      id: "msg_123",
      model: "claude-model",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "Hello" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    const response = await provider.chat!.generateChatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    const callArg = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(callArg.model).toBe("claude-model");
    expect(callArg.messages).toEqual([{ role: "user", content: "hi" }]);
    expect(callArg.max_tokens).toBe(1024);
    expect(response.message.content).toBe("Hello");
  });

  test("extracts system message as top-level system field", async () => {
    fetchMock = mockFetchJson({
      id: "msg_123",
      model: "claude-model",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "ok" }],
    });

    await provider.chat!.generateChatCompletion({
      messages: [
        { role: "system", content: "You are helpful." },
        { role: "user", content: "hello" },
      ],
    });

    const callArg = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(callArg.system).toBe("You are helpful.");
    expect(callArg.messages).toEqual([{ role: "user", content: "hello" }]);
  });

  test("sends x-api-key header", async () => {
    fetchMock = mockFetchJson({
      id: "msg_123",
      model: "claude-model",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "yes" }],
    });

    await provider.chat!.generateChatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-test");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  test("maps response content correctly", async () => {
    fetchMock = mockFetchJson({
      id: "msg_123",
      model: "claude-model",
      type: "message",
      role: "assistant",
      content: [
        { type: "text", text: "Part one " },
        { type: "text", text: "part two" },
      ],
      stop_reason: "end_turn",
    });

    const response = await provider.chat!.generateChatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    expect(response.message.role).toBe("assistant");
    expect(response.message.content).toBe("Part one part two");
    expect(response.finishReason).toBe("end_turn");
  });

  test("maps token usage correctly", async () => {
    fetchMock = mockFetchJson({
      id: "msg_123",
      model: "claude-model",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "x" }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const response = await provider.chat!.generateChatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    expect(response.usage).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    });
  });

  test("handles non-2xx response with AiError", async () => {
    setFetch(async () =>
      new Response("Unauthorized", { status: 401 }),
    );

    await expect(
      provider.chat!.generateChatCompletion({
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toThrow("Anthropic-compatible request failed with status 401.");
  });

  test("sends temperature and top_p settings", async () => {
    fetchMock = mockFetchJson({
      id: "msg_123",
      model: "claude-model",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "ok" }],
    });

    await provider.chat!.generateChatCompletion({
      messages: [{ role: "user", content: "test" }],
      settings: { temperature: 0.7, topP: 0.9, maxTokens: 500, stop: ["END"] },
    });

    const callArg = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(callArg.temperature).toBe(0.7);
    expect(callArg.top_p).toBe(0.9);
    expect(callArg.max_tokens).toBe(500);
    expect(callArg.stop_sequences).toEqual(["END"]);
  });
});

describe("Anthropic-compatible streaming", () => {
  let provider: IAiRuntimeProvider;

  function createStreamResponse(chunks: string[]): Response {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  beforeEach(() => {
    provider = anthropicCompatibleProvider({
      id: "test-anthropic",
      displayName: "Test Anthropic",
      baseUrl: "https://api.example.com",
      defaultChatModel: "claude-model",
    });
  });

  afterEach(() => {
    ((globalThis as any).fetch as FetchMock).mockClear();
  });

  test("sends stream: true", async () => {
    const fm = setFetch(async () => createStreamResponse([]));

    const stream = provider.chat!.streamChatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    const iterator = stream[Symbol.asyncIterator]();
    await iterator.next().catch(() => {});

    const callArg = JSON.parse(fm.mock.calls[0]![1]!.body as string);
    expect(callArg.stream).toBe(true);
  });

  test("yields delta chunks from content_block_delta events", async () => {
    setFetch(async () =>
      createStreamResponse([
        'event: message_start\ndata: {"type":"message_start","message":{"id":"m1","model":"claude-model","type":"message","role":"assistant","content":[]}}\n\n',
        'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}\n\n',
        'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":5}}\n\n',
      ]),
    );

    const parts: string[] = [];
    let finishReason: string | undefined;

    const stream = provider.chat!.streamChatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    for await (const chunk of stream) {
      if (chunk.delta) parts.push(chunk.delta);
      if (chunk.finishReason) finishReason = chunk.finishReason;
    }

    expect(parts).toEqual(["Hello", " world"]);
    expect(finishReason).toBe("end_turn");
  });

  test("handles image part throws AiError in request mapping", async () => {
    await expect(
      provider.chat!.generateChatCompletion({
        messages: [
          {
            role: "user",
            content: [{ type: "image", data: "abc", mimeType: "image/png" }],
          },
        ],
      }),
    ).rejects.toThrow(
      "Anthropic-compatible provider does not support content part type 'image' in request mapping.",
    );
  });

  test("handles thinking part in request", async () => {
    setFetch(async () =>
      new Response(
        JSON.stringify({
          id: "msg_123",
          model: "claude-model",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "answer" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await provider.chat!.generateChatCompletion({
      messages: [
        {
          role: "user",
          content: [{ type: "thinking", text: "Let me think..." }],
        },
      ],
    });

    const callArg = JSON.parse(
      ((globalThis as any).fetch as FetchMock).mock.calls[0]![1]!.body as string,
    );
    expect(callArg.messages[0].content).toEqual([
      { type: "thinking", text: "Let me think..." },
    ]);
  });
});
