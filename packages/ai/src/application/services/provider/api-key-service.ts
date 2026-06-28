// file: packages\ai\src\application\services\provider\api-key-service.ts

import { GenError, Scoped } from "@genspire/core";
import type { ICurrentUser } from "@genspire/auth";
import type { ICreateAiApiKeyInput, IUpdateAiApiKeyInput } from "../../contracts/ai-provider-contracts.js";
import { AiApiKeyEntity } from "../../../domain/providers/index.js";
import { AiProviderDbContext } from "../../../infrastructure/persistence/ai-provider-db-context.js";
import { isAdmin, requireOwnedApiKey, requireProvider, toApiKeyResponse } from "./shared.js";

@Scoped()
export class AiApiKeyService {
  static inject = [AiProviderDbContext];

  constructor(private readonly db: AiProviderDbContext) {}

  async listByProvider(currentUser: ICurrentUser, providerId: string) {
    await requireProvider(this.db, providerId);
    const where = isAdmin(currentUser)
      ? ({ providerId } as Partial<AiApiKeyEntity>)
      : ({ providerId, userId: currentUser.id } as Partial<AiApiKeyEntity>);
    const apiKeys = await this.db.apiKeys.list({ where, orderBy: "name", direction: "asc" });
    return { items: apiKeys.map(toApiKeyResponse) };
  }

  async listForUser(currentUser: ICurrentUser) {
    const apiKeys = await this.db.apiKeys.list({
      where: { userId: currentUser.id } as Partial<AiApiKeyEntity>,
      orderBy: "name",
      direction: "asc",
    });
    return { items: apiKeys.map(toApiKeyResponse) };
  }

  async create(input: ICreateAiApiKeyInput) {
    await requireProvider(this.db, input.providerId);

    const name = input.name?.trim();
    if (!name) {
      throw new GenError("API key name is required.", "AI_API_KEY_NAME_REQUIRED");
    }
    if (!input.value && !input.env) {
      throw new GenError("API key value or env variable is required.", "AI_API_KEY_VALUE_REQUIRED");
    }

    const existing = await this.db.apiKeys.findOne({
      providerId: input.providerId,
      userId: input.currentUser.id,
    } as Partial<AiApiKeyEntity>);
    if (existing) {
      throw new GenError("An API key for this provider already exists for this user.", "AI_API_KEY_EXISTS");
    }

    const now = new Date();
    const apiKey = new AiApiKeyEntity();
    apiKey.id = crypto.randomUUID();
    apiKey.providerId = input.providerId;
    apiKey.userId = input.currentUser.id;
    apiKey.name = name;
    apiKey.value = input.value ?? null;
    apiKey.env = input.env ?? null;
    apiKey.enabled = input.enabled ?? true;
    apiKey.source = input.source ?? "user";
    apiKey.metadata = input.metadata ?? null;
    apiKey.createdAt = now;
    apiKey.updatedAt = now;

    await this.db.apiKeys.add(apiKey);
    await this.db.saveChanges();
    return toApiKeyResponse(apiKey);
  }

  async update(input: IUpdateAiApiKeyInput) {
    const apiKey = await requireOwnedApiKey(this.db, input.currentUser, input.apiKeyId);

    if (input.name !== undefined) {
      const name = input.name?.trim();
      if (!name) {
        throw new GenError("API key name is required.", "AI_API_KEY_NAME_REQUIRED");
      }
      apiKey.name = name;
    }
    if (input.value !== undefined) apiKey.value = input.value;
    if (input.env !== undefined) apiKey.env = input.env;
    if (input.enabled !== undefined) apiKey.enabled = input.enabled;
    if (input.source !== undefined) apiKey.source = input.source;
    if (input.metadata !== undefined) apiKey.metadata = input.metadata;
    apiKey.updatedAt = new Date();

    await this.db.apiKeys.update(apiKey);
    await this.db.saveChanges();
    return toApiKeyResponse(apiKey);
  }

  async delete(currentUser: ICurrentUser, apiKeyId: string) {
    const apiKey = await requireOwnedApiKey(this.db, currentUser, apiKeyId);
    await this.db.apiKeys.remove(apiKey);
    await this.db.saveChanges();
    return { deleted: true, id: apiKeyId };
  }
}