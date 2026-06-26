// file: apps\playground-api\src\database\playground-db-context.ts

import { Scoped } from "@genspire/core";
import { StorageDbContext } from "@genspire/storage";
import { TodoEntity } from "../todos/todo.entity.js";
import { AiSessionEntity } from "../ai/ai-session.entity.js";
import { AiSessionMessageEntity } from "../ai/ai-session-message.entity.js";

@Scoped()
export class PlaygroundDbContext extends StorageDbContext {
  readonly todos = this.set<TodoEntity, string>(TodoEntity);
  readonly aiSessions = this.set<AiSessionEntity, string>(AiSessionEntity);
  readonly aiSessionMessages = this.set<AiSessionMessageEntity, string>(AiSessionMessageEntity);
}
