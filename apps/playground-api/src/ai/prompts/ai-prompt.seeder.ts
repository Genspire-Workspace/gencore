import type { EntityManager } from "@mikro-orm/core";
import { deterministicGuid } from "@genspire/core";
import type { MikroOrmSeeder } from "@genspire/data-mikroorm";
import {
  DEFAULT_SESSION_SYSTEM_PROMPT_NAME,
  DEFAULT_SESSION_SYSTEM_PROMPT_TYPE,
  DEFAULT_SESSION_TITLE_PROMPT_NAME,
  DEFAULT_SESSION_TITLE_PROMPT_TYPE,
} from "@genspire/ai/application";
import type { AiPromptTemplate, AiPromptType } from "@genspire/ai/domain";
import { AiPromptEntity } from "./ai-prompt.entity.js";
import { AiPromptTypeDefaultEntity } from "./ai-prompt-type-default.entity.js";
import { AiPromptTypeEntity } from "./ai-prompt-type.entity.js";

interface ISeedPromptDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  argumentHint: string;
  template: AiPromptTemplate;
  type: AiPromptType;
  isDefault: boolean;
}

interface ISeedPromptTypeDefinition {
  id: string;
  name: string;
  description: string;
}

function seedPromptId(key: string): string {
  return deterministicGuid(`playground:ai-prompt:${key}`);
}

const SEEDED_PROMPTS: readonly ISeedPromptDefinition[] = [
  {
    id: seedPromptId("system-prompt"),
    name: DEFAULT_SESSION_SYSTEM_PROMPT_NAME,
    description: "Regular system prompt used by standard chat sessions.",
    version: "1.0.0",
    argumentHint: "",
    type: DEFAULT_SESSION_SYSTEM_PROMPT_TYPE,
    isDefault: true,
    template:
      "You are a helpful AI assistant. Provide clear, accurate, and concise answers. Follow the user's instructions carefully, ask for clarification when necessary, and keep responses practical and relevant to the current conversation.",
  },
  {
    id: seedPromptId("session-title-generator-prompt"),
    name: DEFAULT_SESSION_TITLE_PROMPT_NAME,
    description: "Generates a concise session title from the user's message.",
    version: "1.0.0",
    argumentHint: "",
    type: DEFAULT_SESSION_TITLE_PROMPT_TYPE,
    isDefault: true,
    template:
      "Generate a short, specific title for this chat based on the user's message. Use plain text only. Keep it under 8 words and avoid quotes or trailing punctuation.",
  },
] as const;

const SEEDED_PROMPT_TYPES: readonly ISeedPromptTypeDefinition[] = [
  {
    id: "system_prompt",
    name: "System Prompt",
    description: "Prompts used as system-level instructions for chat generation.",
  },
  {
    id: "user_prompt",
    name: "User Prompt",
    description: "General prompts intended for user-authored or user-facing prompt flows.",
  },
  {
    id: "chat_title_generation",
    name: "Chat Title Generation",
    description: "Prompts used to generate chat session titles.",
  },
  {
    id: "chat_summarization",
    name: "Chat Summarization",
    description: "Prompts used to summarize chat sessions or conversation branches.",
  },
  {
    id: "chat_memory_extraction",
    name: "Chat Memory Extraction",
    description: "Prompts used to extract durable memory from chat conversations.",
  },
] as const;

const LEGACY_SEEDED_PROMPT_IDS = [
  seedPromptId("session-summary"),
  seedPromptId("agent-plan"),
  seedPromptId("code-review"),
] as const;

export function createPlaygroundAiPromptSeeder(): MikroOrmSeeder {
  return {
    name: "playground-ai-prompt-seeder",

    async run(em: EntityManager): Promise<void> {
      const repo = em.getRepository(AiPromptEntity);
      const typeRepo = em.getRepository(AiPromptTypeEntity);
      const defaultRepo = em.getRepository(AiPromptTypeDefaultEntity);
      const activeSeedIds = new Set(SEEDED_PROMPTS.map((item) => item.id));

      for (const definition of SEEDED_PROMPT_TYPES) {
        const existingType = await typeRepo.findOne({ id: definition.id } as never);

        if (existingType) {
          let changed = false;

          if (existingType.name !== definition.name) {
            existingType.name = definition.name;
            changed = true;
          }

          if (existingType.description !== definition.description) {
            existingType.description = definition.description;
            changed = true;
          }

          if (existingType.isSystem !== true) {
            existingType.isSystem = true;
            changed = true;
          }

          if (changed) {
            existingType.updatedAt = new Date();
            em.persist(existingType);
          }

          continue;
        }

        const promptType = new AiPromptTypeEntity();
        promptType.id = definition.id;
        promptType.name = definition.name;
        promptType.description = definition.description;
        promptType.isSystem = true;
        promptType.createdAt = new Date();
        promptType.updatedAt = new Date();
        em.persist(promptType);
      }

      for (const legacyId of LEGACY_SEEDED_PROMPT_IDS) {
        if (activeSeedIds.has(legacyId)) {
          continue;
        }

        const legacyPrompt = await repo.findOne({ id: legacyId } as never);
        if (!legacyPrompt) {
          continue;
        }

        em.remove(legacyPrompt);
      }

      const existingPrompts = await repo.findAll();
      for (const prompt of existingPrompts) {
        if (prompt.type !== null && prompt.type !== undefined && prompt.type.trim().length > 0) {
          continue;
        }

        prompt.type = "user_prompt";
        prompt.updatedAt = new Date();
        em.persist(prompt);
      }

      for (const definition of SEEDED_PROMPTS) {
        const existing = await repo.findOne({ id: definition.id } as never);

        if (existing) {
          let changed = false;

          if (existing.visibility !== "system") {
            existing.visibility = "system";
            changed = true;
          }

          if (existing.userId !== null) {
            existing.userId = null;
            changed = true;
          }

          if (existing.name !== definition.name) {
            existing.name = definition.name;
            changed = true;
          }

          if (existing.type !== definition.type) {
            existing.type = definition.type;
            changed = true;
          }

          if (existing.description !== definition.description) {
            existing.description = definition.description;
            changed = true;
          }

          if (existing.version !== definition.version) {
            existing.version = definition.version;
            changed = true;
          }

          if (existing.argumentHint !== definition.argumentHint) {
            existing.argumentHint = definition.argumentHint;
            changed = true;
          }

          if (JSON.stringify(existing.template) !== JSON.stringify(definition.template)) {
            existing.template = definition.template;
            changed = true;
          }

          if (changed) {
            existing.updatedAt = new Date();
            em.persist(existing);
          }

          continue;
        }

        const prompt = new AiPromptEntity();
        prompt.id = definition.id;
        prompt.userId = null;
        prompt.visibility = "system";
        prompt.type = definition.type;
        prompt.name = definition.name;
        prompt.description = definition.description;
        prompt.version = definition.version;
        prompt.argumentHint = definition.argumentHint;
        prompt.template = definition.template;
        prompt.variables = null;
        prompt.metadata = null;
        prompt.createdAt = new Date();
        prompt.updatedAt = new Date();

        em.persist(prompt);
      }

      for (const definition of SEEDED_PROMPTS.filter((item) => item.isDefault)) {
        const existingDefault = await defaultRepo.findOne({ typeId: definition.type } as never);
        if (existingDefault) {
          if (existingDefault.promptId !== definition.id) {
            existingDefault.promptId = definition.id;
            existingDefault.updatedAt = new Date();
            em.persist(existingDefault);
          }
          continue;
        }

        const promptDefault = new AiPromptTypeDefaultEntity();
        promptDefault.typeId = definition.type;
        promptDefault.promptId = definition.id;
        promptDefault.createdAt = new Date();
        promptDefault.updatedAt = new Date();
        em.persist(promptDefault);
      }

      await em.flush();
    },
  };
}
