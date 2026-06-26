import { Entity, Index, PrimaryKey, Property } from "@mikro-orm/decorators";

export type AiSessionMessageRole = "user" | "assistant" | "system" | "tool";

@Entity({ tableName: "ai_session_messages" })
@Index({
  name: "ai_session_messages_session_created_index",
  properties: ["sessionId", "createdAt"],
})
export class AiSessionMessageEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  sessionId!: string;

  @Property({ type: "string" })
  role!: AiSessionMessageRole;

  @Property({ type: "json" })
  content!: unknown;

  @Property({ type: "string", nullable: true })
  name?: string | null;

  @Property({ type: "string", nullable: true })
  provider?: string | null;

  @Property({ type: "string", nullable: true })
  model?: string | null;

  @Property({ type: "string", nullable: true })
  finishReason?: string | null;

  @Property({ type: "json", nullable: true })
  usage?: Record<string, unknown> | null;

  @Property({ type: "json", nullable: true })
  toolCalls?: unknown[] | null;

  @Property({ type: "json", nullable: true })
  toolResults?: unknown[] | null;

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, unknown> | null;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();
}
