import type { EntityManager } from "@mikro-orm/core";

export interface MikroOrmSeeder {
  name: string;
  run(entityManager: EntityManager): Promise<void> | void;
}
