import { Entity, Index, PrimaryKey, Property } from "@mikro-orm/decorators";

export type AiSkillVisibility = "private" | "shared" | "system";
export type AiSkillExecutionMode = "server" | "client";
export type AiSkillBundleFormat = "inline" | "zip";

@Entity({ tableName: "ai_skills" })
@Index({ name: "ai_skills_user_id_index", properties: ["userId"] })
@Index({ name: "ai_skills_visibility_index", properties: ["visibility"] })
@Index({ name: "ai_skills_execution_mode_index", properties: ["executionMode"] })
@Index({ name: "ai_skills_name_index", properties: ["name"] })
export class AiSkillEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string", nullable: true })
  userId: string | null = null;

  @Property({ type: "string" })
  visibility: AiSkillVisibility = "private";

  @Property({ type: "string" })
  name!: string;

  @Property({ type: "text" })
  description!: string;

  @Property({ type: "text", nullable: true })
  instructions: string | null = null;

  @Property({ type: "string", nullable: true })
  compatibility: string | null = null;

  @Property({ type: "string", nullable: true })
  license: string | null = null;

  @Property({ type: "json", nullable: true })
  metadata: Record<string, unknown> | null = null;

  @Property({ type: "json", nullable: true })
  allowedTools: string[] | null = null;

  @Property({ type: "boolean", default: false })
  disableModelInvocation = false;

  @Property({ type: "string" })
  executionMode: AiSkillExecutionMode = "server";

  @Property({ type: "string" })
  bundleFormat: AiSkillBundleFormat = "inline";

  @Property({ type: "string", nullable: true })
  bundleStorageFileId: string | null = null;

  @Property({ type: "json", nullable: true })
  manifest: Record<string, unknown> | null = null;

  @Property({ type: "boolean", default: true })
  registered = true;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
