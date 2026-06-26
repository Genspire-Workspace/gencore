import { Entity, Index, PrimaryKey, Property } from "@mikro-orm/decorators";

@Entity({ tableName: "ai_sessions" })
@Index({ name: "ai_sessions_user_updated_index", properties: ["userId", "updatedAt"] })
export class AiSessionEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  userId!: string;

  @Property({ type: "string", nullable: true })
  title?: string | null;

  @Property({ type: "string", nullable: true })
  provider?: string | null;

  @Property({ type: "string", nullable: true })
  model?: string | null;

  @Property({ type: "text", nullable: true })
  systemPrompt?: string | null;

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, unknown> | null;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
