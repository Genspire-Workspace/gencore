// file: apps\playground-api\src\database\playground-db-context.ts

import { Scoped } from "@genspire/core";
import { StorageDbContext } from "@genspire/storage";
import { TodoEntity } from "../todos/todo.entity.js";
import { AiSessionEntity } from "../ai/sessions/ai-session.entity.js";
import { AiSessionMessageEntity } from "../ai/sessions/ai-session-message.entity.js";
import { AiPromptEntity } from "../ai/prompts/ai-prompt.entity.js";
import { AiSkillEntity } from "../ai/skills/ai-skill.entity.js";

@Scoped()
export class PlaygroundDbContext extends StorageDbContext {
  readonly todos = this.set<TodoEntity, string>(TodoEntity);
  readonly aiSessions = this.set<AiSessionEntity, string>(AiSessionEntity);
  readonly aiSessionMessages = this.set<AiSessionMessageEntity, string>(AiSessionMessageEntity);
  readonly aiPrompts = this.set<AiPromptEntity, string>(AiPromptEntity);
  readonly aiSkills = this.set<AiSkillEntity, string>(AiSkillEntity);
}
