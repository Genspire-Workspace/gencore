// file: packages/ai/src/domain/session/entities/ai-generation-run.entity.ts

import { Entity, Index, PrimaryKey, Property } from "@mikro-orm/decorators";
import type { AiGenerationRunStatus } from "../types/ai-session-types.js";

@Entity({ tableName: "ai_session_generation_runs" })
@Index({ name: "ai_session_generation_runs_session_created_index", properties: ["sessionId", "createdAt"] })
export class AiGenerationRunEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  sessionId!: string;

  @Property({ type: "string" })
  timelineId!: string;

  @Property({ type: "string" })
  turnId!: string;

  @Property({ type: "string" })
  status: AiGenerationRunStatus = "running";

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

  @Property({ type: "json", nullable: true })
  usage?: Record<string, unknown> | null;

  @Property({ type: "text", nullable: true })
  error?: string | null;

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, unknown> | null;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
