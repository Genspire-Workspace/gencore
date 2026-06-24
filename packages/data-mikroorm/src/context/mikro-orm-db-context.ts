// file: packages\data-mikroorm\src\context\mikro-orm-db-context.ts

import type { DbContext } from "@genspire/data";
import type { EntityClass, EntityManager } from "@mikro-orm/core";
import { EntityManagerProvider } from "./entity-manager-provider.js";
import { MikroOrmDbSet } from "./mikro-orm-db-set.js";

export abstract class MikroOrmDbContext implements DbContext {
  protected readonly em: EntityManager;

  protected constructor(entityManagerProvider: EntityManagerProvider) {
    this.em = entityManagerProvider.fork();
  }

  protected set<TEntity extends object, TId = string>(
    entityClass: EntityClass<TEntity>,
    options?: {
      idField?: keyof TEntity & string;
    },
  ): MikroOrmDbSet<TEntity, TId> {
    return new MikroOrmDbSet<TEntity, TId>(
      this.em,
      entityClass,
      options?.idField ?? "id",
    );
  }

  async saveChanges(): Promise<void> {
    await this.em.flush();
  }

  async transaction<T>(operation: () => Promise<T>): Promise<T> {
    return await this.em.transactional(async () => await operation());
  }
}
