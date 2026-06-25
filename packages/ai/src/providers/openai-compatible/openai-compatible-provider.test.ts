// file: packages\ai\src\providers\openai-compatible\openai-compatible-provider.test.ts

import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { openAiCompatibleProvider } from "./openai-compatible-provider.js";
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

describe("OpenAI-compatible chat", () => {
  let provider: IAiRuntimeProvider;
  let fetchMock: FetchMock;

  beforeEach(() => {
    setFetch(async () => new Response("{}"));
    provider = openAiCompatibleProvider({
      id: "test-provider",
      displayName: "Test Provider",
      baseUrl: "https://api.example.com/v1",
      apiKey: "sk-test",
      defaultChatModel: "test-model",
      defaultEmbeddingModel: "test-embedding",
    });
  });

  afterEach(() => {
    ((globalThis as any).fetch as FetchMock).mockClear();
  });

  test("sends correct /chat/completions request", async () => {
    fetchMock = mockFetchJson({
      id: "chatcmpl-123",
      model: "test-model",
      choices: [
        {
          message: { role: "assistant", content: "Hello world" },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    });

    const response = await provider.chat!.generateChatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    const callArg = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(callArg.model).toBe("test-model");
    expect(callArg.messages).toEqual([{ role: "user", content: "hi" }]);
    expect(response.message.content).toBe("Hello world");
  });

  test("includes authorization header when API key exists", async () => {
    fetchMock = mockFetchJson({
      id: "chatcmpl-123",
      model: "test-model",
      choices: [{ message: { role: "assistant", content: "yes" } }],
    });

    await provider.chat!.generateChatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-test");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  test("maps response message correctly", async () => {
    fetchMock = mockFetchJson({
      id: "chatcmpl-123",
      model: "test-model",
      choices: [
        {
          message: { role: "assistant", content: "mapped response" },
          finish_reason: "stop",
        },
      ],
    });

    const response = await provider.chat!.generateChatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    expect(response.message.role).toBe("assistant");
    expect(response.message.content).toBe("mapped response");
    expect(response.finishReason).toBe("stop");
  });

  test("maps token usage correctly", async () => {
    fetchMock = mockFetchJson({
      id: "chatcmpl-123",
      model: "test-model",
      choices: [{ message: { role: "assistant", content: "x" } }],
      usage: {
        prompt_tokens: 5,
        completion_tokens: 10,
        total_tokens: 15,
      },
    });

    const response = await provider.chat!.generateChatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    expect(response.usage).toEqual({
      inputTokens: 5,
      outputTokens: 10,
      totalTokens: 15,
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
    ).rejects.toThrow("OpenAI-compatible request failed with status 401.");
  });
});

describe("OpenAI-compatible streaming", () => {
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
    provider = openAiCompatibleProvider({
      id: "test-provider",
      displayName: "Test Provider",
      baseUrl: "https://api.example.com/v1",
      apiKey: "sk-test",
      defaultChatModel: "test-model",
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

    const callArg = JSON.parse(
      fm.mock.calls[0]![1]!.body as string,
    );
    expect(callArg.stream).toBe(true);
  });

  test("parses SSE data lines", async () => {
    setFetch(async () =>
      createStreamResponse([
        'data: {"id":"c1","model":"test-model","choices":[{"delta":{"content":"Hello"}}]}\n\n',
      ]),
    );

    const chunks: string[] = [];
    const stream = provider.chat!.streamChatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    for await (const chunk of stream) {
      if (chunk.delta) chunks.push(chunk.delta);
    }

    expect(chunks).toEqual(["Hello"]);
  });

  test("yields delta chunks", async () => {
    setFetch(async () =>
      createStreamResponse([
        'data: {"id":"c1","model":"test-model","choices":[{"delta":{"content":"Part"}}]}\n\n',
        'data: {"id":"c1","model":"test-model","choices":[{"delta":{"content":" 1"}}]}\n\n',
        'data: {"id":"c1","model":"test-model","choices":[{"delta":{"content":" done"}}]}\n\n',
      ]),
    );

    const parts: string[] = [];
    const stream = provider.chat!.streamChatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    for await (const chunk of stream) {
      if (chunk.delta) parts.push(chunk.delta);
    }

    expect(parts.join("")).toBe("Part 1 done");
  });

  test("handles [DONE]", async () => {
    setFetch(async () =>
      createStreamResponse([
        'data: {"id":"c1","model":"test-model","choices":[{"delta":{"content":"Done"}}]}\n\n',
        "data: [DONE]\n\n",
      ]),
    );

    const parts: string[] = [];
    const stream = provider.chat!.streamChatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    for await (const chunk of stream) {
      if (chunk.delta) parts.push(chunk.delta);
    }

    expect(parts).toEqual(["Done"]);
  });

  test("maps finish reason", async () => {
    setFetch(async () =>
      createStreamResponse([
        'data: {"id":"c1","model":"test-model","choices":[{"delta":{"content":"End"},"finish_reason":"stop"}]}\n\n',
      ]),
    );

    let finishReason: string | undefined;
    const stream = provider.chat!.streamChatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    for await (const chunk of stream) {
      if (chunk.finishReason) finishReason = chunk.finishReason;
    }

    expect(finishReason).toBe("stop");
  });

  test("ignores blank lines", async () => {
    setFetch(async () =>
      createStreamResponse([
        "\n",
        'data: {"id":"c1","model":"test-model","choices":[{"delta":{"content":"Data"}}]}\n\n',
        "\n\n",
        "\n",
      ]),
    );

    const parts: string[] = [];
    const stream = provider.chat!.streamChatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    for await (const chunk of stream) {
      if (chunk.delta) parts.push(chunk.delta);
    }

    expect(parts).toEqual(["Data"]);
  });
});

describe("OpenAI-compatible embeddings", () => {
  let provider: IAiRuntimeProvider;

  beforeEach(() => {
    provider = openAiCompatibleProvider({
      id: "test-provider",
      displayName: "Test Provider",
      baseUrl: "https://api.example.com/v1/",
      apiKey: "sk-test",
      defaultEmbeddingModel: "test-embedding",
    });
  });

  afterEach(() => {
    ((globalThis as any).fetch as FetchMock).mockClear();
  });

  test("sends correct /embeddings request", async () => {
    const fm = setFetch(async () =>
      new Response(
        JSON.stringify({
          model: "test-embedding",
          data: [{ index: 0, embedding: [0.1, 0.2, 0.3] }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const response = await provider.embeddings!.generateEmbedding({
      input: "test text",
    });

    const callArg = JSON.parse(
      fm.mock.calls[0]![1]!.body as string,
    );
    expect(callArg.model).toBe("test-embedding");
    expect(callArg.input).toBe("test text");
    expect(response.model).toBe("test-embedding");
  });

  test("maps embeddings correctly", async () => {
    setFetch(async () =>
      new Response(
        JSON.stringify({
          model: "test-embedding",
          data: [
            { index: 0, embedding: [1, 2, 3] },
            { index: 1, embedding: [4, 5, 6] },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const response = await provider.embeddings!.generateEmbedding({
      input: ["text1", "text2"],
    });

    expect(response.embeddings).toHaveLength(2);
    expect(response.embeddings[0]!.embedding).toEqual([1, 2, 3]);
    expect(response.embeddings[1]!.embedding).toEqual([4, 5, 6]);
  });

  test("maps token usage correctly", async () => {
    setFetch(async () =>
      new Response(
        JSON.stringify({
          model: "test-embedding",
          data: [{ index: 0, embedding: [0.1] }],
          usage: { prompt_tokens: 42, total_tokens: 42 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const response = await provider.embeddings!.generateEmbedding({
      input: "test",
    });

    expect(response.usage).toEqual({
      inputTokens: 42,
      totalTokens: 42,
    });
  });

  test("supports string input", async () => {
    const fm = setFetch(async () =>
      new Response(
        JSON.stringify({
          model: "test-embedding",
          data: [{ index: 0, embedding: [0.5] }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const response = await provider.embeddings!.generateEmbedding({
      input: "single string",
    });

    const callArg = JSON.parse(
      fm.mock.calls[0]![1]!.body as string,
    );
    expect(callArg.input).toBe("single string");
    expect(response.embeddings).toHaveLength(1);
  });

  test("supports string array input", async () => {
    const fm = setFetch(async () =>
      new Response(
        JSON.stringify({
          model: "test-embedding",
          data: [
            { index: 0, embedding: [0.1] },
            { index: 1, embedding: [0.2] },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const response = await provider.embeddings!.generateEmbedding({
      input: ["text1", "text2"],
    });

    const callArg = JSON.parse(
      fm.mock.calls[0]![1]!.body as string,
    );
    expect(Array.isArray(callArg.input)).toBe(true);
    expect(callArg.input).toEqual(["text1", "text2"]);
    expect(response.embeddings).toHaveLength(2);
  });

  test("supports optional dimensions", async () => {
    const fm = setFetch(async () =>
      new Response(
        JSON.stringify({
          model: "test-embedding",
          data: [{ index: 0, embedding: new Array(256).fill(0) }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await provider.embeddings!.generateEmbedding({
      input: "test",
      dimensions: 256,
    });

    const callArg = JSON.parse(
      fm.mock.calls[0]![1]!.body as string,
    );
    expect(callArg.dimensions).toBe(256);
  });
});

describe("OpenAI-compatible content mapping", () => {
  let provider: IAiRuntimeProvider;

  beforeEach(() => {
    provider = openAiCompatibleProvider({
      id: "test-provider",
      displayName: "Test Provider",
      baseUrl: "https://api.example.com/v1",
      defaultChatModel: "test-model",
    });
  });

  afterEach(() => {
    ((globalThis as any).fetch as FetchMock).mockClear();
  });

  test("string message content maps to OpenAI string content", async () => {
    setFetch(async () =>
      new Response(
        JSON.stringify({
          id: "c1",
          model: "test-model",
          choices: [{ message: { role: "assistant", content: "ok" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await provider.chat!.generateChatCompletion({
      messages: [{ role: "user", content: "plain text" }],
    });

    const callArg = JSON.parse(
      ((globalThis as any).fetch as FetchMock).mock.calls[0]![1]!.body as string,
    );
    expect(callArg.messages[0].content).toBe("plain text");
  });

  test("text part content maps to OpenAI text content block", async () => {
    setFetch(async () =>
      new Response(
        JSON.stringify({
          id: "c1",
          model: "test-model",
          choices: [{ message: { role: "assistant", content: "ok" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await provider.chat!.generateChatCompletion({
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "structured text" }],
        },
      ],
    });

    const callArg = JSON.parse(
      ((globalThis as any).fetch as FetchMock).mock.calls[0]![1]!.body as string,
    );
    expect(callArg.messages[0].content).toEqual([
      { type: "text", text: "structured text" },
    ]);
  });

  test("image part content maps to OpenAI image_url content block", async () => {
    setFetch(async () =>
      new Response(
        JSON.stringify({
          id: "c1",
          model: "test-model",
          choices: [{ message: { role: "assistant", content: "ok" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await provider.chat!.generateChatCompletion({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "describe this" },
            { type: "image", data: "abc123", mimeType: "image/png" },
          ],
        },
      ],
    });

    const callArg = JSON.parse(
      ((globalThis as any).fetch as FetchMock).mock.calls[0]![1]!.body as string,
    );
    expect(callArg.messages[0].content).toEqual([
      { type: "text", text: "describe this" },
      {
        type: "image_url",
        image_url: { url: "data:image/png;base64,abc123" },
      },
    ]);
  });

  test("unsupported thinking part throws AiError", async () => {
    await expect(
      provider.chat!.generateChatCompletion({
        messages: [
          {
            role: "user",
            content: [{ type: "thinking", text: "reasoning" }],
          },
        ],
      }),
    ).rejects.toThrow(
      "OpenAI-compatible provider does not support content part type 'thinking' in request mapping.",
    );
  });

  test("unsupported tool_call part throws AiError", async () => {
    await expect(
      provider.chat!.generateChatCompletion({
        messages: [
          {
            role: "assistant",
            content: [
              { type: "tool_call", id: "tc1", name: "search", arguments: { q: "test" } },
            ],
          },
        ],
      }),
    ).rejects.toThrow(
      "OpenAI-compatible provider does not support content part type 'tool_call' in request mapping.",
    );
  });

  test("unsupported tool_result part throws AiError", async () => {
    await expect(
      provider.chat!.generateChatCompletion({
        messages: [
          {
            role: "tool",
            content: [
              { type: "tool_result", toolCallId: "tc1", content: "result" },
            ],
          },
        ],
      }),
    ).rejects.toThrow(
      "OpenAI-compatible provider does not support content part type 'tool_result' in request mapping.",
    );
  });
});

describe("Common/chat compatibility", () => {
  let provider: IAiRuntimeProvider;

  beforeEach(() => {
    provider = openAiCompatibleProvider({
      id: "test-provider",
      displayName: "Test Provider",
      baseUrl: "https://api.example.com/v1",
      defaultChatModel: "test-model",
    });
  });

  afterEach(() => {
    ((globalThis as any).fetch as FetchMock).mockClear();
  });

  test("IChatMessage accepts string content", async () => {
    setFetch(async () =>
      new Response(
        JSON.stringify({
          id: "c1",
          model: "test-model",
          choices: [{ message: { role: "assistant", content: "reply" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const response = await provider.chat!.generateChatCompletion({
      messages: [{ role: "user", content: "hello" }],
    });

    expect(response.message.content).toBe("reply");
    expect(response.message.role).toBe("assistant");
  });

  test("IChatMessage accepts structured text parts", async () => {
    setFetch(async () =>
      new Response(
        JSON.stringify({
          id: "c1",
          model: "test-model",
          choices: [{ message: { role: "assistant", content: "reply" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const response = await provider.chat!.generateChatCompletion({
      messages: [
        { role: "user", content: [{ type: "text", text: "structured hello" }] },
      ],
    });

    expect(response.message.content).toBe("reply");
  });

  test("ChatRole remains usable as before", async () => {
    setFetch(async () =>
      new Response(
        JSON.stringify({
          id: "c1",
          model: "test-model",
          choices: [{ message: { role: "assistant", content: "ok" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const response = await provider.chat!.generateChatCompletion({
      messages: [
        { role: "system", content: "You are helpful." },
        { role: "user", content: "hello" },
        { role: "assistant", content: "hi" },
      ],
    });

    const callArg = JSON.parse(
      ((globalThis as any).fetch as FetchMock).mock.calls[0]![1]!.body as string,
    );
    expect(callArg.messages).toHaveLength(3);
    expect(callArg.messages[0].role).toBe("system");
    expect(callArg.messages[1].role).toBe("user");
    expect(callArg.messages[2].role).toBe("assistant");
    expect(response.message.role).toBe("assistant");
  });
});
