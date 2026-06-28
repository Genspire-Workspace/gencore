// file: packages\ai\src\application\services\provider\service.ts

import { GenError, Scoped } from "@genspire/core";
import type { ICreateAiProviderInput, IUpdateAiProviderInput } from "../../contracts/ai-provider-contracts.js";
import { AiProviderEntity } from "../../../domain/providers/index.js";
import { AiProviderDbContext } from "../../../infrastructure/persistence/ai-provider-db-context.js";
import { assertAdmin, requireProvider, toProviderResponse } from "./shared.js";

@Scoped()
export class AiProviderService {
  static inject = [AiProviderDbContext];

  constructor(private readonly db: AiProviderDbContext) {}

  async list() {
    const providers = await this.db.providers.list({
      orderBy: "name",
      direction: "asc",
    });
    return { items: providers.map(toProviderResponse) };
  }

  async getById(providerId: string) {
    return toProviderResponse(await requireProvider(this.db, providerId));
  }

  async create(input: ICreateAiProviderInput) {
    assertAdmin(input.currentUser);

    const name = input.name?.trim();
    if (!name) {
      throw new GenError("Provider name is required.", "AI_PROVIDER_NAME_REQUIRED");
    }

    const existing = await this.db.providers.findOne({ name } as Partial<AiProviderEntity>);
    if (existing) {
      throw new GenError("A provider with this name already exists.", "AI_PROVIDER_NAME_TAKEN");
    }

    const now = new Date();
    const provider = new AiProviderEntity();
    provider.id = input.id?.trim() || crypto.randomUUID();
    provider.name = name;
    provider.kind = input.kind;
    provider.clientKind = input.clientKind;
    provider.baseUrl = input.baseUrl ?? null;
    provider.api = input.api ?? null;
    provider.doc = input.doc ?? null;
    provider.website = input.website ?? null;
    provider.metadata = input.metadata ?? null;
    provider.createdAt = now;
    provider.updatedAt = now;

    await this.db.providers.add(provider);
    await this.db.saveChanges();
    return toProviderResponse(provider);
  }

  async update(input: IUpdateAiProviderInput) {
    assertAdmin(input.currentUser);
    const provider = await requireProvider(this.db, input.providerId);

    if (input.name !== undefined) {
      const name = input.name?.trim();
      if (!name) {
        throw new GenError("Provider name is required.", "AI_PROVIDER_NAME_REQUIRED");
      }
      const clash = await this.db.providers.findOne({ name } as Partial<AiProviderEntity>);
      if (clash && clash.id !== provider.id) {
        throw new GenError("A provider with this name already exists.", "AI_PROVIDER_NAME_TAKEN");
      }
      provider.name = name;
    }
    if (input.kind !== undefined) provider.kind = input.kind;
    if (input.clientKind !== undefined) provider.clientKind = input.clientKind;
    if (input.baseUrl !== undefined) provider.baseUrl = input.baseUrl;
    if (input.api !== undefined) provider.api = input.api;
    if (input.doc !== undefined) provider.doc = input.doc;
    if (input.website !== undefined) provider.website = input.website;
    if (input.metadata !== undefined) provider.metadata = input.metadata;
    provider.updatedAt = new Date();

    await this.db.providers.update(provider);
    await this.db.saveChanges();
    return toProviderResponse(provider);
  }

  async delete(currentUser: ICreateAiProviderInput["currentUser"], providerId: string) {
    assertAdmin(currentUser);
    const provider = await requireProvider(this.db, providerId);

    const models = await this.db.models.list({ where: { providerId } as Partial<AiProviderEntity> });
    for (const model of models) {
      await this.db.models.remove(model);
    }
    const apiKeys = await this.db.apiKeys.list({ where: { providerId } as Partial<AiProviderEntity> });
    for (const apiKey of apiKeys) {
      await this.db.apiKeys.remove(apiKey);
    }
    await this.db.providers.remove(provider);
    await this.db.saveChanges();
    return { deleted: true, id: providerId };
  }
}