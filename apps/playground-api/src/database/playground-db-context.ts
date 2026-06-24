import { Scoped } from "@genspire/core";
import { EntityManagerProvider, MikroOrmDbContext } from "@genspire/data-mikroorm";
import { TodoEntity } from "../todos/todo.entity.js";

@Scoped()
export class PlaygroundDbContext extends MikroOrmDbContext {
  static inject = [EntityManagerProvider];

  readonly todos = this.set<TodoEntity, string>(TodoEntity);

  constructor(entityManagerProvider: EntityManagerProvider) {
    super(entityManagerProvider);
  }
}
