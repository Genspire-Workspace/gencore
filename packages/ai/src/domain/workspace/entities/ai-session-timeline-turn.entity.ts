// file: packages/ai/src/domain/workspace/entities/ai-session-timeline-turn.entity.ts

import { Entity, Index, PrimaryKey, Property, Unique } from "@mikro-orm/decorators";
import type { AiSessionTimelineTurnSource } from "../types/ai-workspace-types.js";

@Entity({ tableName: "ai_workspace_timeline_turns" })
@Index({ name: "ai_workspace_timeline_turns_timeline_index", properties: ["timelineId", "index"] })
@Unique({ name: "ai_workspace_timeline_turns_unique_timeline_index", properties: ["timelineId", "index"] })
export class AiSessionTimelineTurnEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  sessionId!: string;

  @Property({ type: "string" })
  timelineId!: string;

  @Property({ type: "string" })
  turnId!: string;

  @Property({ type: "integer" })
  index!: number;

  @Property({ type: "string" })
  source: AiSessionTimelineTurnSource = "original";

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
