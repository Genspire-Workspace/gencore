// file: packages/ai/src/domain/session/entities/ai-session-turn.entity.ts

import { Entity, Index, PrimaryKey, Property } from "@mikro-orm/decorators";
import type { AiSessionTurnStatus } from "../types/ai-session-types.js";

@Entity({ tableName: "ai_session_turns" })
@Index({ name: "ai_session_turns_session_created_index", properties: ["sessionId", "createdAt"] })
export class AiSessionTurnEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  sessionId!: string;

  @Property({ type: "string" })
  status: AiSessionTurnStatus = "running";

  @Property({ type: "string", nullable: true })
  provider?: string | null;

  @Property({ type: "string", nullable: true })
  model?: string | null;

  @Property({ type: "datetime", nullable: true })
  startedAt?: Date | null;

  @Property({ type: "datetime", nullable: true })
  finishedAt?: Date | null;

  @Property({ type: "integer", nullable: true })
  durationMs?: number | null;

  @Property({ type: "string", nullable: true })
  finishReason?: string | null;

  @Property({ type: "text", nullable: true })
  error?: string | null;

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, unknown> | null;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
