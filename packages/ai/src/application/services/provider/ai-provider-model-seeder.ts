// file: packages\ai\src\application\services\provider\seeder.ts

import { AiProviderEntity } from "../../../domain/providers/index.js";
import { AiProviderDbContext } from "../../../infrastructure/persistence/ai-provider-db-context.js";

export interface ISeedAiProviderInput {
  id: string;
  name: string;
  kind: AiProviderEntity["kind"];
  clientKind: AiProviderEntity["clientKind"];
  baseUrl?: string | null;
  api?: string | null;
  doc?: string | null;
  website?: string | null;
}

export const defaultAiProviders: readonly ISeedAiProviderInput[] = [
  {
    id: "ollama",
    name: "Ollama",
    kind: "local",
    clientKind: "ollama",
    api: "ollama",
    website: "https://ollama.com",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    kind: "cloud",
    clientKind: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    api: "https://api.deepseek.com/v1",
    doc: "https://api-docs.deepseek.com/quick_start/pricing",
    website: "https://www.deepseek.com",
  },
];

export async function seedAiProviders(
  db: AiProviderDbContext,
  providers: readonly ISeedAiProviderInput[] = defaultAiProviders,
): Promise<void> {
  for (const input of providers) {
    const existing = await db.providers.findById(input.id);
    if (existing) {
      continue;
    }

    const now = new Date();
    const provider = new AiProviderEntity();
    provider.id = input.id;
    provider.name = input.name;
    provider.kind = input.kind;
    provider.clientKind = input.clientKind;
    provider.baseUrl = input.baseUrl ?? null;
    provider.api = input.api ?? null;
    provider.doc = input.doc ?? null;
    provider.website = input.website ?? null;
    provider.metadata = null;
    provider.createdAt = now;
    provider.updatedAt = now;
    await db.providers.add(provider);
  }

  await db.saveChanges();
}
