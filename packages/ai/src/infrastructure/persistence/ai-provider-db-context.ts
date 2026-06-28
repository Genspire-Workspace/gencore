// file: packages\ai\src\infrastructure\persistence\ai-provider-db-context.ts

import { Scoped } from "@genspire/core";
import { EntityManagerProvider, MikroOrmDbContext } from "@genspire/data-mikroorm";
import {
  AiApiKeyEntity,
  AiModelEntity,
  AiProviderEntity,
} from "../../domain/providers/index.js";

@Scoped()
export class AiProviderDbContext extends MikroOrmDbContext {
  static inject = [EntityManagerProvider];

  readonly providers = this.set<AiProviderEntity, string>(AiProviderEntity);
  readonly models = this.set<AiModelEntity, string>(AiModelEntity);
  readonly apiKeys = this.set<AiApiKeyEntity, string>(AiApiKeyEntity);

  constructor(entityManagerProvider: EntityManagerProvider) {
    super(entityManagerProvider);
  }
}