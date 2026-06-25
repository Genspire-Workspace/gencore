import { Scoped } from "@genspire/core";
import { EntityManagerProvider, MikroOrmDbContext } from "@genspire/data-mikroorm";
import { FileEntity } from "./file.entity.js";

@Scoped()
export class StorageDbContext extends MikroOrmDbContext {
  static inject = [EntityManagerProvider];

  readonly files = this.set<FileEntity, string>(FileEntity);

  constructor(entityManagerProvider: EntityManagerProvider) {
    super(entityManagerProvider);
  }
}
