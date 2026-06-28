// file: apps/playground-app-ai/src/verify/verify.test.ts

import path from "node:path";
import { describe, expect, test } from "bun:test";
import { AiGenerationService } from "../../../../packages/ai/src/application/services/generation/ai-generation-service.js";
import { createPlaygroundAiApp } from "../playground-ai-app.js";
import { createMockProviderClient } from "../ai/mock-provider-client.js";
import {
  createAppAiLogger,
  createDefaultImagePart,
  createSolidColorPngBase64,
  resolveModelCapabilities,
  verifyProvider,
  type IDefaultModelCapabilities,
} from "./shared/index.js";

describe("app-ai verify shared library", () => {
  test("createSolidColorPngBase64 produces a valid PNG image part", () => {
    const base64 = createSolidColorPngBase64(8, 8, [255, 0, 0]);
    const buffer = Buffer.from(base64, "base64");

    expect(buffer.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );

    const part = createDefaultImagePart();
    expect(part.type).toBe("image");
    expect(part.mediaType).toBe("image/png");
    expect(part.data.length).toBeGreaterThan(0);
  });

  test("resolveModelCapabilities reads input modalities from the catalogue", () => {
    const caps = resolveModelCapabilities("google/gemma-4-26b-a4b-it");

    expect(caps.source).toBe("catalogue");
    expect(caps.supportsImage).toBe(true);
    expect(caps.supportsReasoning).toBe(true);
    expect(caps.inputModalities).toContain("image");
  });

  test("resolveModelCapabilities falls back to script defaults for unknown models", () => {
    const defaults: IDefaultModelCapabilities = {
      inputModalities: ["text", "image"],
      reasoning: true,
    };

    const caps = resolveModelCapabilities("gemma4:12b", defaults);

    expect(caps.source).toBe("defaults");
    expect(caps.supportsImage).toBe(true);
    expect(caps.supportsReasoning).toBe(true);
  });

  test("resolveModelCapabilities defaults to text-only when no defaults are given", () => {
    const caps = resolveModelCapabilities("some-unknown-text-model");

    expect(caps.source).toBe("defaults");
    expect(caps.supportsImage).toBe(false);
    expect(caps.inputModalities).toEqual(["text"]);
  });

  test("verifyProvider runs chat, reasoning, vision, and embedding scenarios against a mock provider", async () => {
    const app = await createPlaygroundAiApp({
      clients: [createMockProviderClient()],
    });

    await app.start();

    try {
      const service = app.get(AiGenerationService);
      const logDir = path.resolve(
        import.meta.dirname,
        "../../../../.tmp/app-ai-test",
      );
      const logger = createAppAiLogger({
        provider: "mock",
        filePrefix: "test",
        logDir,
      });

      const result = await verifyProvider({
        provider: "mock",
        providerName: "Mock",
        service,
        chatModels: ["mock-model"],
        embedModel: "mock-model",
        supportsEmbedding: true,
        defaultModelCapabilities: {
          inputModalities: ["text", "image"],
          reasoning: true,
          toolCall: true,
        },
        logger,
      });

      await logger.close();

      expect(result.total).toBe(7);
      expect(result.passed).toBe(7);
      expect(result.failed).toBe(0);

      const logExists = await Bun.file(result.logPath).exists();
      expect(logExists).toBe(true);
    } finally {
      await app.stop();
    }
  });
});
