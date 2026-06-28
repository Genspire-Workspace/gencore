// file: packages/ai/src/domain/session/entities/ai-session-message.entity.ts

import { Entity, Index, PrimaryKey, Property, Unique } from "@mikro-orm/decorators";
import type { AiSessionMessageRole } from "../types/ai-session-types.js";

@Entity({ tableName: "ai_session_messages" })
@Index({ name: "ai_session_messages_turn_index", properties: ["turnId", "index"] })
@Unique({ name: "ai_session_messages_unique_turn_index", properties: ["turnId", "index"] })
export class AiSessionMessageEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  sessionId!: string;

  @Property({ type: "string" })
  turnId!: string;

  @Property({ type: "integer" })
  index!: number;

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

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
