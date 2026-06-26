// file: apps\playground-api\src\ai\ai-session.entity.ts

import { Entity, Index, PrimaryKey, Property } from "@mikro-orm/decorators";

@Entity({ tableName: "ai_sessions" })
@Index({ name: "ai_sessions_user_id_index", properties: ["userId"] })
export class AiSessionEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  userId!: string;

  @Property({ type: "string", nullable: true })
  title: string | null = null;

  @Property({ type: "string", nullable: true })
  provider: string | null = null;

  @Property({ type: "string", nullable: true })
  model: string | null = null;

  @Property({ type: "text", nullable: true })
  systemPrompt: string | null = null;

  @Property({ type: "json", nullable: true })
  metadata: Record<string, unknown> | null = null;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}