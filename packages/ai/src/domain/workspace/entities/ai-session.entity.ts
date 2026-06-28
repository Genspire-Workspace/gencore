// file: packages/ai/src/domain/workspace/entities/ai-session.entity.ts

import { Entity, Index, PrimaryKey, Property } from "@mikro-orm/decorators";
import type { IAiSessionSettings, AiSessionType } from "../types/ai-workspace-types.js";

@Entity({ tableName: "ai_workspace_sessions" })
@Index({ name: "ai_workspace_sessions_user_updated_index", properties: ["userId", "updatedAt"] })
export class AiSessionEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  userId!: string;

  @Property({ type: "string", nullable: true })
  title?: string | null;

  @Property({ type: "string" })
  type: AiSessionType = "chat";

  @Property({ type: "string", nullable: true })
  defaultTimelineId?: string | null;

  @Property({ type: "json", nullable: true })
  settings?: IAiSessionSettings | null;

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, unknown> | null;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
