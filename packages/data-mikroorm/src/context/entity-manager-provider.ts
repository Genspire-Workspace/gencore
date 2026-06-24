// file: packages\data-mikroorm\src\context\entity-manager-provider.ts

import type { EntityManager } from "@mikro-orm/core";
import { MikroOrmService } from "../extension/mikro-orm-extension.js";

export class EntityManagerProvider {
  constructor(private readonly service: MikroOrmService) {}

  getEntityManager(): ReturnType<MikroOrmService["getEntityManager"]> & EntityManager {
    return this.service.getEntityManager();
  }

  fork(): ReturnType<ReturnType<MikroOrmService["getEntityManager"]>["fork"]> & EntityManager {
    return this.service.getEntityManager().fork();
  }
}
