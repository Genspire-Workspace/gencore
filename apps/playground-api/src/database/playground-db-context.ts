// file: apps\playground-api\src\database\playground-db-context.ts

import { Scoped } from "@genspire/core";
import { StorageDbContext } from "@genspire/storage";
import { TodoEntity } from "../todos/todo.entity.js";


import { AiPromptEntity } from "../ai/prompts/ai-prompt.entity.js";
import { AiSkillEntity } from "../ai/skills/ai-skill.entity.js";

@Scoped()
export class PlaygroundDbContext extends StorageDbContext {
  readonly todos = this.set<TodoEntity, string>(TodoEntity);


  readonly aiPrompts = this.set<AiPromptEntity, string>(AiPromptEntity);
  readonly aiSkills = this.set<AiSkillEntity, string>(AiSkillEntity);
}
