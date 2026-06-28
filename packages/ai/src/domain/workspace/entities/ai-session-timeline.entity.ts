// file: packages/ai/src/domain/workspace/entities/ai-session-timeline.entity.ts

import { Entity, Index, PrimaryKey, Property } from "@mikro-orm/decorators";

@Entity({ tableName: "ai_workspace_timelines" })
@Index({ name: "ai_workspace_timelines_session_created_index", properties: ["sessionId", "createdAt"] })
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
