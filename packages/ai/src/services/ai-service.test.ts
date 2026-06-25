import { describe, expect, test } from "bun:test";
import { AiClientRegistry } from "../clients/ai-client-registry.js";
import { AiService } from "./ai-service.js";

describe("AiService", () => {
  test("throws for chat generation until clients are reimplemented", async () => {
    const service = new AiService(new AiClientRegistry(), {
      chatProvider: "openai",
      chatModel: "gpt-4",
    });

    await expect(
      service.generateChatCompletion({
        messages: [{ role: "user", content: "hello" }],
      }),
    ).rejects.toThrow(
      "AI generation is not available yet. AI clients have not been implemented.",
    );
  });

  test("throws for chat streaming until clients are reimplemented", async () => {
    const service = new AiService(new AiClientRegistry(), {
      chatProvider: "openai",
      chatModel: "gpt-4",
    });

    expect(() =>
      service.streamChatCompletion({
        messages: [{ role: "user", content: "hello" }],
      }),
    ).toThrow(
      "AI generation is not available yet. AI clients have not been implemented.",
    );
  });

  test("throws for embeddings until clients are reimplemented", async () => {
    const service = new AiService(new AiClientRegistry(), {
      embeddingProvider: "openai",
      embeddingModel: "text-embedding-3-small",
    });

    await expect(
      service.generateEmbedding({
        input: "test",
      }),
    ).rejects.toThrow(
      "AI generation is not available yet. AI clients have not been implemented.",
    );
  });
});
