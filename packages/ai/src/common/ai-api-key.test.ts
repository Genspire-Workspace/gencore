import { describe, expect, test } from "bun:test";
import { resolveAiApiKey, resolveAiApiKeyValue } from "./ai-api-key.js";

describe("IAiApiKey resolution", () => {
  test("prefers a model-scoped user key over a provider key", () => {
    const key = resolveAiApiKey(
      [
        {
          id: "provider",
          name: "Provider Key",
          value: "provider-secret",
          provider: "openai",
        },
        {
          id: "user-model",
          name: "User Model Key",
          value: "user-model-secret",
          provider: "openai",
          model: "gpt-5",
          userId: "user-1",
        },
      ],
      {
        provider: "openai",
        model: "gpt-5",
        userId: "user-1",
      },
    );

    expect(key?.id).toBe("user-model");
  });

  test("respects explicit apiKeyId selection", () => {
    const key = resolveAiApiKey(
      [
        {
          id: "provider",
          name: "Provider Key",
          value: "provider-secret",
          provider: "openai",
        },
        {
          id: "secondary",
          name: "Secondary Key",
          value: "secondary-secret",
          provider: "openai",
        },
      ],
      {
        provider: "openai",
        apiKeyId: "secondary",
      },
    );

    expect(key?.id).toBe("secondary");
  });

  test("returns inline apiKey as the highest-priority override", () => {
    const value = resolveAiApiKeyValue(
      [
        {
          id: "provider",
          name: "Provider Key",
          value: "provider-secret",
          provider: "openai",
        },
      ],
      {
        provider: "openai",
        apiKey: "task-secret",
      },
    );

    expect(value).toBe("task-secret");
  });
});
