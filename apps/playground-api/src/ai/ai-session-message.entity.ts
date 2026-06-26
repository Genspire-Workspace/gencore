// file: apps\playground-api\src\ai\ai-session-message.entity.ts

import { Entity, Index, PrimaryKey, Property } from "@mikro-orm/decorators";

export type AiSessionMessageRole = "system" | "user" | "assistant" | "tool";

@Entity({ tableName: "ai_session_messages" })
@Index({ name: "ai_session_messages_session_id_index", properties: ["sessionId"] })
@Index({ name: "ai_session_messages_session_id_created_at_index", properties: ["sessionId", "createdAt"] })
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
  name: string | null = null;

  @Property({ type: "string", nullable: true })
  provider: string | null = null;

  @Property({ type: "string", nullable: true })
  model: string | null = null;

  @Property({ type: "string", nullable: true })
  finishReason: string | null = null;

  @Property({ type: "json", nullable: true })
  usage: Record<string, unknown> | null = null;

  @Property({ type: "json", nullable: true })
  toolCalls: unknown[] | null = null;

  @Property({ type: "json", nullable: true })
  toolResults: unknown[] | null = null;

  @Property({ type: "json", nullable: true })
  metadata: Record<string, unknown> | null = null;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();
}