import { Entity, Index, PrimaryKey, Property } from "@mikro-orm/decorators";
import type { AiPromptTemplate } from "../../../../../packages/ai/src/prompts/ai-prompt.js";

export type AiPromptVisibility = "private" | "shared" | "system";

@Entity({ tableName: "ai_prompts" })
@Index({ name: "ai_prompts_user_id_index", properties: ["userId"] })
@Index({ name: "ai_prompts_visibility_index", properties: ["visibility"] })
@Index({ name: "ai_prompts_name_index", properties: ["name"] })
export class AiPromptEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string", nullable: true })
  userId: string | null = null;

  @Property({ type: "string" })
  visibility: AiPromptVisibility = "private";

  @Property({ type: "string" })
  name!: string;

  @Property({ type: "text", nullable: true })
  description: string | null = null;

  @Property({ type: "string", nullable: true })
  argumentHint: string | null = null;

  @Property({ type: "string", nullable: true })
  version: string | null = null;

  @Property({ type: "json" })
  template!: AiPromptTemplate;

  @Property({ type: "json", nullable: true })
  variables: unknown[] | null = null;

  @Property({ type: "json", nullable: true })
  metadata: Record<string, unknown> | null = null;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
