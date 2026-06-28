// file: packages/ai/src/domain/session/entities/ai-session-message-feedback.entity.ts

import { Entity, Index, PrimaryKey, Property, Unique } from "@mikro-orm/decorators";
import type { AiSessionFeedbackRating } from "../types/ai-session-types.js";

@Entity({ tableName: "ai_session_message_feedback" })
@Index({ name: "ai_session_message_feedback_message_created_index", properties: ["messageId", "createdAt"] })
@Unique({ name: "ai_session_message_feedback_message_user_unique", properties: ["messageId", "userId"] })
export class AiSessionMessageFeedbackEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: "string" })
  sessionId!: string;

  @Property({ type: "string" })
  messageId!: string;

  @Property({ type: "string" })
  userId!: string;

  @Property({ type: "string" })
  rating!: AiSessionFeedbackRating;

  @Property({ type: "text", nullable: true })
  comment?: string | null;

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, unknown> | null;

  @Property({ type: "datetime" })
  createdAt: Date = new Date();

  @Property({ type: "datetime", onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
