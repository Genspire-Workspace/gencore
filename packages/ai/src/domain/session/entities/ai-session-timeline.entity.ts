// file: packages/ai/src/domain/session/entities/ai-session-timeline.entity.ts

import { Entity, Index, PrimaryKey, Property } from "@mikro-orm/decorators";

@Entity({ tableName: "ai_session_timelines" })
@Index({ name: "ai_session_timelines_session_created_index", properties: ["sessionId", "createdAt"] })
export class AiSessionTimelineEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  sessionId!: string;

  @Property({ type: "string", nullable: true })
  name?: string | null;

  @Property({ type: "boolean" })
  isDefault = false;

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, unknown> | null;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
