// file: packages\data-mikroorm\src\seeding\mikro-orm-seeder.ts

import type { EntityManager } from "@mikro-orm/core";

export interface IMikroOrmSeeder {
  name: string;
  run(entityManager: EntityManager): Promise<void> | void;
}
