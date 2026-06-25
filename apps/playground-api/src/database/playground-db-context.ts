// file: apps\playground-api\src\database\playground-db-context.ts

import { Scoped } from "@genspire/core";
import { StorageDbContext } from "@genspire/storage";
import { TodoEntity } from "../todos/todo.entity.js";

@Scoped()
export class PlaygroundDbContext extends StorageDbContext {
  readonly todos = this.set<TodoEntity, string>(TodoEntity);
}
