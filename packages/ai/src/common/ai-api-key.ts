// file: packages\ai\src\common\ai-api-key.ts

export type AiApiKeySource =
  | "direct"
  | "environment"
  | "provider"
  | "model"
  | "user"
  | "task"
  | "custom";

export interface IAiApiKey {
  id: string;
  name: string;
  value?: string;
  env?: string;
  provider?: string;
  model?: string;
  userId?: string;
  enabled?: boolean;
  source?: AiApiKeySource;
  metadata?: Record<string, unknown>;
}

export interface IAiApiKeyResolveInput {
  provider?: string;
  model?: string;
  userId?: string;
  apiKey?: string;
  apiKeyId?: string;
}

export function resolveAiApiKey(
  keys: readonly IAiApiKey[] | undefined,
  input: IAiApiKeyResolveInput,
): IAiApiKey | undefined {
  if (input.apiKey) {
    return {
      id: "__inline__",
      name: "Inline API Key",
      value: input.apiKey,
      provider: input.provider,
      model: input.model,
      userId: input.userId,
      source: "task",
      enabled: true,
    };
  }

  if (!keys || keys.length === 0) {
    return undefined;
  }

  if (input.apiKeyId) {
    return keys.find((key) => key.id === input.apiKeyId && key.enabled !== false);
  }

  let bestMatch: IAiApiKey | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const key of keys) {
    if (key.enabled === false) {
      continue;
    }

    if (key.provider && key.provider !== input.provider) {
      continue;
    }

    if (key.model && key.model !== input.model) {
      continue;
    }

    if (key.userId && key.userId !== input.userId) {
      continue;
    }

    const score = getAiApiKeyScore(key);
    if (score > bestScore) {
      bestMatch = key;
      bestScore = score;
    }
  }

  return bestMatch;
}

export function resolveAiApiKeyValue(
  keys: readonly IAiApiKey[] | undefined,
  input: IAiApiKeyResolveInput,
): string | undefined {
  const key = resolveAiApiKey(keys, input);

  if (!key) {
    return undefined;
  }

  if (key.value) {
    return key.value;
  }

  if (key.env) {
    return process.env[key.env];
  }

  return undefined;
}

function getAiApiKeyScore(key: IAiApiKey): number {
  let score = 0;

  if (key.provider) {
    score += 10;
  }

  if (key.model) {
    score += 20;
  }

  if (key.userId) {
    score += 40;
  }

  return score;
}
