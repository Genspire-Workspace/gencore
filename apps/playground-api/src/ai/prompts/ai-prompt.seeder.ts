import type { EntityManager } from "@mikro-orm/core";
import { deterministicGuid } from "@genspire/core";
import type { MikroOrmSeeder } from "@genspire/data-mikroorm";
import {
  DEFAULT_SESSION_SYSTEM_PROMPT_NAME,
  DEFAULT_SESSION_TITLE_PROMPT_NAME,
} from "@genspire/ai/application";
import type { AiPromptTemplate } from "@genspire/ai/domain";
import { AiPromptEntity } from "./ai-prompt.entity.js";

interface ISeedPromptDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  argumentHint: string;
  template: AiPromptTemplate;
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
    template:
      "You are a helpful AI assistant. Provide clear, accurate, and concise answers. Follow the user's instructions carefully, ask for clarification when necessary, and keep responses practical and relevant to the current conversation.",
  },
  {
    id: seedPromptId("session-title-generator-prompt"),
    name: DEFAULT_SESSION_TITLE_PROMPT_NAME,
    description: "Generates a concise session title from the user's message.",
    version: "1.0.0",
    argumentHint: "",
    template:
      "Generate a short, specific title for this chat based on the user's message. Use plain text only. Keep it under 8 words and avoid quotes or trailing punctuation.",
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
      const activeSeedIds = new Set(SEEDED_PROMPTS.map((item) => item.id));

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

      await em.flush();
    },
  };
}
