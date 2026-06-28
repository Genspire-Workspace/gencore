// file: apps/playground-app-ai/src/playground-ai-app.test.ts

import { describe, expect, test } from "bun:test";
import { AiGenerationService } from "../../../packages/ai/src/application/services/generation/ai-generation-service.js";
import { createPlaygroundAiApp } from "./playground-ai-app.js";
import { createMockProviderClient } from "./ai/mock-provider-client.js";
import { runAiVerification } from "./ai/verify-ai.js";

describe("playground-app-ai", () => {
  test("registers the ai extension and resolves AiGenerationService from the app container", async () => {
    const app = await createPlaygroundAiApp();

    expect(app.hasExtension("ai")).toBe(true);
    expect(app.get(AiGenerationService)).toBeInstanceOf(AiGenerationService);

    await app.start();
    await app.stop();
  });

  test("runs chat, streaming, and embedding verification through the app", async () => {
    const app = await createPlaygroundAiApp({
      clients: [createMockProviderClient()],
    });

    await app.start();

    try {
      const result = await runAiVerification(app);

      expect(result.chatReply).toContain("Mock reply to:");
      expect(result.streamDeltas.length).toBeGreaterThan(0);
      expect(result.embeddingDimensions).toBe(8);
    } finally {
      await app.stop();
    }
  });

  test("falls back to the default mock client when none is provided", async () => {
    const app = await createPlaygroundAiApp();

    await app.start();

    try {
      const result = await runAiVerification(app);
      expect(result.chatReply).toContain("Mock reply to:");
    } finally {
      await app.stop();
    }
  });
});