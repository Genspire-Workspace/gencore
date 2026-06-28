// file: packages\ai\src\application\services\provider\model-service.ts

import { GenError, Scoped } from "@genspire/core";
import type { ICreateAiModelInput, IUpdateAiModelInput } from "../../contracts/ai-provider-contracts.js";
import { AiModelEntity } from "../../../domain/providers/index.js";
import { AiProviderDbContext } from "../../../infrastructure/persistence/ai-provider-db-context.js";
import { assertAdmin, requireModel, requireProvider, toModelResponse } from "./shared.js";

@Scoped()
export class AiModelService {
  static inject = [AiProviderDbContext];

  constructor(private readonly db: AiProviderDbContext) {}

  async listByProvider(providerId: string) {
    await requireProvider(this.db, providerId);
    const models = await this.db.models.list({
      where: { providerId } as Partial<AiModelEntity>,
      orderBy: "name",
      direction: "asc",
    });
    return { items: models.map(toModelResponse) };
  }

  async getById(modelId: string) {
    return toModelResponse(await requireModel(this.db, modelId));
  }

  async create(input: ICreateAiModelInput) {
    assertAdmin(input.currentUser);
    await requireProvider(this.db, input.providerId);

    const name = input.name?.trim();
    if (!name) {
      throw new GenError("Model name is required.", "AI_MODEL_NAME_REQUIRED");
    }

    const existing = await this.db.models.findOne({
      providerId: input.providerId,
      name,
    } as Partial<AiModelEntity>);
    if (existing) {
      throw new GenError("A model with this name already exists for this provider.", "AI_MODEL_NAME_TAKEN");
    }

    const now = new Date();
    const model = new AiModelEntity();
    model.id = crypto.randomUUID();
    model.providerId = input.providerId;
    model.name = name;
    model.family = input.family ?? null;
    model.capabilities = input.capabilities ?? null;
    model.metadata = input.metadata ?? null;
    model.createdAt = now;
    model.updatedAt = now;

    await this.db.models.add(model);
    await this.db.saveChanges();
    return toModelResponse(model);
  }

  async update(input: IUpdateAiModelInput) {
    assertAdmin(input.currentUser);
    const model = await requireModel(this.db, input.modelId);

    if (input.name !== undefined) {
      const name = input.name?.trim();
      if (!name) {
        throw new GenError("Model name is required.", "AI_MODEL_NAME_REQUIRED");
      }
      const clash = await this.db.models.findOne({
        providerId: model.providerId,
        name,
      } as Partial<AiModelEntity>);
      if (clash && clash.id !== model.id) {
        throw new GenError("A model with this name already exists for this provider.", "AI_MODEL_NAME_TAKEN");
      }
      model.name = name;
    }
    if (input.family !== undefined) model.family = input.family;
    if (input.capabilities !== undefined) model.capabilities = input.capabilities;
    if (input.metadata !== undefined) model.metadata = input.metadata;
    model.updatedAt = new Date();

    await this.db.models.update(model);
    await this.db.saveChanges();
    return toModelResponse(model);
  }

  async delete(currentUser: ICreateAiModelInput["currentUser"], modelId: string) {
    assertAdmin(currentUser);
    const model = await requireModel(this.db, modelId);
    await this.db.models.remove(model);
    await this.db.saveChanges();
    return { deleted: true, id: modelId };
  }
}