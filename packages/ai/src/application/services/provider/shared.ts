// file: packages\ai\src\application\services\provider\shared.ts

import { GenError } from "@genspire/core";
import type { ICurrentUser } from "@genspire/auth";
import {
  AiApiKeyEntity,
  AiModelEntity,
  AiProviderEntity,
} from "../../../domain/providers/index.js";
import { AiProviderDbContext } from "../../../infrastructure/persistence/ai-provider-db-context.js";

export function isAdmin(currentUser: ICurrentUser | null | undefined): boolean {
  return Boolean(currentUser?.roles?.some((role) => role.toLowerCase() === "admin"));
}

export function assertAdmin(currentUser: ICurrentUser): void {
  if (!isAdmin(currentUser)) {
    throw new GenError("Admin access is required.", "AI_ADMIN_REQUIRED");
  }
}

export async function requireProvider(
  db: AiProviderDbContext,
  providerId: string,
): Promise<AiProviderEntity> {
  const provider = await db.providers.findById(providerId);
  if (!provider) {
    throw new GenError("AI provider not found.", "AI_PROVIDER_NOT_FOUND");
  }
  return provider;
}

export async function requireModel(
  db: AiProviderDbContext,
  modelId: string,
): Promise<AiModelEntity> {
  const model = await db.models.findById(modelId);
  if (!model) {
    throw new GenError("AI model not found.", "AI_MODEL_NOT_FOUND");
  }
  return model;
}

export async function requireOwnedApiKey(
  db: AiProviderDbContext,
  currentUser: ICurrentUser,
  apiKeyId: string,
): Promise<AiApiKeyEntity> {
  const apiKey = await db.apiKeys.findById(apiKeyId);
  if (!apiKey || (apiKey.userId !== currentUser.id && !isAdmin(currentUser))) {
    throw new GenError("AI API key not found.", "AI_API_KEY_NOT_FOUND");
  }
  return apiKey;
}

export function toProviderResponse(provider: AiProviderEntity) {
  return {
    id: provider.id,
    name: provider.name,
    kind: provider.kind,
    clientKind: provider.clientKind,
    baseUrl: provider.baseUrl,
    api: provider.api,
    doc: provider.doc,
    website: provider.website,
    metadata: provider.metadata,
    createdAt: provider.createdAt.toISOString(),
    updatedAt: provider.updatedAt.toISOString(),
  };
}

export function toModelResponse(model: AiModelEntity) {
  return {
    id: model.id,
    providerId: model.providerId,
    name: model.name,
    family: model.family,
    capabilities: model.capabilities,
    metadata: model.metadata,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}

export function toApiKeyResponse(apiKey: AiApiKeyEntity) {
  const value = apiKey.value ?? null;
  const preview = value && value.length > 4 ? value.slice(-4) : value ? "••••" : undefined;
  return {
    id: apiKey.id,
    providerId: apiKey.providerId,
    userId: apiKey.userId,
    name: apiKey.name,
    hasValue: Boolean(value),
    valuePreview: preview,
    env: apiKey.env,
    enabled: apiKey.enabled,
    source: apiKey.source,
    metadata: apiKey.metadata,
    createdAt: apiKey.createdAt.toISOString(),
    updatedAt: apiKey.updatedAt.toISOString(),
  };
}