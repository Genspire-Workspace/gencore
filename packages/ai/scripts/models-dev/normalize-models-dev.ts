import type { AiClientKind } from "../../src/clients/ai-client-kind.js";
import type { IAiLab } from "../../src/common/ai-lab.js";
import type { AiModelModality, IAiModel, IAiModelBenchmark, IAiModelCost, IAiModelInterleaved, IAiModelLimit, IAiModelLink, IAiModelModalities } from "../../src/common/ai-model.js";
import type { IAiProvider, AiProviderKind } from "../../src/common/ai-provider.js";
import type { IModelsDevFetchResult } from "./fetch-models-dev.js";
import { asBoolean, asNumber, asString, asStringArray, isRecord, toSortedRecord } from "./utils.js";

export interface IModelsDevNormalizedCatalogue {
  providers: Record<string, IAiProvider>;
  models: Record<string, IAiModel>;
  labs: Record<string, IAiLab>;
}

export function normalizeModelsDev(
  input: IModelsDevFetchResult,
): IModelsDevNormalizedCatalogue {
  const providers = normalizeProviderSources(input);
  const models = normalizeModelSources(input);
  const labs = normalizeLabSources(input);

  return {
    providers: toSortedRecord(providers),
    models: toSortedRecord(models),
    labs: toSortedRecord(labs),
  };
}

function normalizeProviderSources(input: IModelsDevFetchResult): Record<string, IAiProvider> {
  return {
    ...normalizeProviderRecord(extractNamedRecord(input.catalog, "providers")),
    ...normalizeProviderRecord(extractNamedRecord(input.api, "providers") ?? input.api),
  };
}

function normalizeModelSources(input: IModelsDevFetchResult): Record<string, IAiModel> {
  return {
    ...normalizeModelRecord(extractNamedRecord(input.catalog, "models")),
    ...normalizeModelRecord(extractNamedRecord(input.models, "models") ?? input.models),
  };
}

function normalizeLabSources(input: IModelsDevFetchResult): Record<string, IAiLab> {
  return {
    ...normalizeLabRecord(extractNamedRecord(input.catalog, "labs")),
    ...normalizeLabRecord(extractNamedRecord(input.api, "labs")),
  };
}

function extractNamedRecord(source: unknown, key: string): unknown {
  if (!isRecord(source)) {
    return undefined;
  }

  return source[key];
}

export function normalizeProviderRecord(raw: unknown): Record<string, IAiProvider> {
  if (!isRecord(raw)) {
    return {};
  }

  const providers: Record<string, IAiProvider> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (!isRecord(value)) {
      continue;
    }

    if (!("id" in value) && !("name" in value) && !("npm" in value) && !("api" in value)) {
      continue;
    }

    const id = asString(value.id) ?? key;
    const name = asString(value.name) ?? id;
    const npm = asString(value.npm);
    const api = asString(value.api);

    providers[id] = {
      id,
      name,
      env: asStringArray(value.env),
      npm,
      api,
      doc: asString(value.doc),
      website: asString(value.website),
      models: asNumber(value.models),
      clientKind: inferClientKind({ id, npm, api }),
      kind: inferProviderKind({ id, npm, api }),
      metadata: collectMetadata(value, [
        "id",
        "name",
        "env",
        "npm",
        "api",
        "doc",
        "website",
        "models",
      ]),
    };
  }

  return providers;
}

export function normalizeModelRecord(raw: unknown): Record<string, IAiModel> {
  if (!isRecord(raw)) {
    return {};
  }

  const models: Record<string, IAiModel> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (!isRecord(value)) {
      continue;
    }

    if (!("id" in value) && !("name" in value)) {
      continue;
    }

    const id = asString(value.id) ?? key;
    const name = asString(value.name) ?? id;

    models[id] = {
      id,
      name,
      family: asString(value.family),
      attachment: asBoolean(value.attachment),
      reasoning: asBoolean(value.reasoning),
      tool_call: asBoolean(value.tool_call),
      structured_output: asBoolean(value.structured_output),
      temperature: asBoolean(value.temperature),
      interleaved: normalizeInterleaved(value.interleaved),
      knowledge: asString(value.knowledge),
      release_date: asString(value.release_date),
      last_updated: asString(value.last_updated),
      modalities: normalizeModalities(value.modalities),
      open_weights: asBoolean(value.open_weights),
      limit: normalizeLimit(value.limit),
      cost: normalizeCost(value.cost),
      weights: normalizeLinks(value.weights),
      benchmarks: normalizeBenchmarks(value.benchmarks),
      metadata: collectMetadata(value, [
        "id",
        "name",
        "family",
        "attachment",
        "reasoning",
        "tool_call",
        "structured_output",
        "temperature",
        "interleaved",
        "knowledge",
        "release_date",
        "last_updated",
        "modalities",
        "open_weights",
        "limit",
        "cost",
        "weights",
        "benchmarks",
      ]),
    };
  }

  return models;
}

export function normalizeLabRecord(raw: unknown): Record<string, IAiLab> {
  if (!isRecord(raw)) {
    return {};
  }

  const labs: Record<string, IAiLab> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (isRecord(value)) {
      const id = asString(value.id) ?? key;
      labs[id] = {
        id,
        name: asString(value.name) ?? id,
        description: asString(value.description),
        url: asString(value.url),
        metadata: collectMetadata(value, ["id", "name", "description", "url"]),
      };
      continue;
    }

    if (typeof value === "string") {
      labs[key] = {
        id: key,
        name: value,
      };
    }
  }

  return labs;
}

export function inferClientKind(provider: {
  id?: string;
  npm?: string;
  api?: string;
}): AiClientKind {
  if (provider.id === "ollama") return "ollama";
  if (provider.api?.includes("localhost:11434")) return "ollama";

  switch (provider.npm) {
    case "@ai-sdk/openai":
      return "openai";
    case "@ai-sdk/anthropic":
      return "anthropic";
    case "@ai-sdk/google":
    case "@ai-sdk/google-vertex":
      return "google";
    case "@ai-sdk/amazon-bedrock":
      return "amazon-bedrock";
    case "@ai-sdk/openai-compatible":
      return "openai-compatible";
    default:
      return "custom";
  }
}

export function inferProviderKind(provider: {
  id?: string;
  npm?: string;
  api?: string;
}): AiProviderKind {
  if (provider.id === "ollama") return "local";
  if (provider.api?.includes("localhost")) return "local";

  if (
    provider.id === "openrouter" ||
    provider.id === "requesty" ||
    provider.id === "vercel-ai-gateway"
  ) {
    return "gateway";
  }

  if (
    provider.id === "amazon-bedrock" ||
    provider.id === "google-vertex" ||
    provider.id === "azure-openai"
  ) {
    return "cloud";
  }

  if (
    provider.id === "openai" ||
    provider.id === "anthropic" ||
    provider.id === "google" ||
    provider.id === "mistral" ||
    provider.id === "xai" ||
    provider.id === "z-ai" ||
    provider.id === "zhipuai"
  ) {
    return "first-party";
  }

  if (provider.npm === "@ai-sdk/openai-compatible") {
    return "gateway";
  }

  return "custom";
}

function normalizeModalities(raw: unknown): IAiModelModalities {
  if (!isRecord(raw)) {
    return defaultModalities();
  }

  return {
    input: asModalityArray(raw.input) ?? ["text"],
    output: asModalityArray(raw.output) ?? ["text"],
  };
}

function normalizeInterleaved(raw: unknown): IAiModelInterleaved | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const field = asString(raw.field);
  return field ? { field } : undefined;
}

function normalizeLimit(raw: unknown): IAiModelLimit | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const limit: IAiModelLimit = {
    context: asNumber(raw.context),
    input: asNumber(raw.input),
    output: asNumber(raw.output),
  };

  return hasDefinedValue(limit) ? limit : undefined;
}

function normalizeCost(raw: unknown): IAiModelCost | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const cost: IAiModelCost = {
    input: asNumber(raw.input),
    output: asNumber(raw.output),
    cache_read: asNumber(raw.cache_read),
    cache_write: asNumber(raw.cache_write),
  };

  return hasDefinedValue(cost) ? cost : undefined;
}

function normalizeLinks(raw: unknown): IAiModelLink[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const links = raw
    .filter(isRecord)
    .map((entry) => {
      const url = asString(entry.url);
      if (!url) {
        return undefined;
      }

      const label = asString(entry.label);
      const name = asString(entry.name);

      return {
        url,
        ...(label ? { label } : {}),
        ...(name ? { name } : {}),
      } satisfies IAiModelLink;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);

  return links.length > 0 ? links : undefined;
}

function normalizeBenchmarks(raw: unknown): IAiModelBenchmark[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const benchmarks = raw
    .filter(isRecord)
    .map((entry) => {
      const name = asString(entry.name);
      const score = asNumber(entry.score);

      if (!name || score === undefined) {
        return undefined;
      }

      const metric = asString(entry.metric);
      const source = asString(entry.source);

      return {
        name,
        score,
        ...(metric ? { metric } : {}),
        ...(source ? { source } : {}),
      } satisfies IAiModelBenchmark;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);

  return benchmarks.length > 0 ? benchmarks : undefined;
}

function defaultModalities(): IAiModelModalities {
  return {
    input: ["text"],
    output: ["text"],
  };
}

function asModalityArray(value: unknown): AiModelModality[] | undefined {
  const items = asStringArray(value);
  if (!items) {
    return undefined;
  }

  return items.filter(isAiModelModality);
}

function collectMetadata(
  value: Record<string, unknown>,
  knownKeys: string[],
): Record<string, unknown> | undefined {
  const metadata = Object.fromEntries(
    Object.entries(value).filter(([key]) => !knownKeys.includes(key)),
  );

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function hasDefinedValue(record: object): boolean {
  return Object.values(record).some((value) => value !== undefined);
}

function isAiModelModality(value: string): value is AiModelModality {
  return value === "text"
    || value === "image"
    || value === "audio"
    || value === "video"
    || value === "file"
    || value === "embedding";
}
