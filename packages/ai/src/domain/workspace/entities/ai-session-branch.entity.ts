// file: packages/ai/src/domain/workspace/entities/ai-session-branch.entity.ts

import { Entity, Index, PrimaryKey, Property } from "@mikro-orm/decorators";
import type { AiSessionBranchReason } from "../types/ai-workspace-types.js";

@Entity({ tableName: "ai_workspace_branches" })
@Index({ name: "ai_workspace_branches_session_created_index", properties: ["sessionId", "createdAt"] })
export class AiSessionBranchEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  sessionId!: string;

  @Property({ type: "string" })
  sourceTimelineId!: string;

  @Property({ type: "string" })
  sourceTurnId!: string;

  @Property({ type: "integer" })
  sourceTurnIndex!: number;

  @Property({ type: "string" })
  targetTimelineId!: string;

  @Property({ type: "string" })
  reason!: AiSessionBranchReason;

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, unknown> | null;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
