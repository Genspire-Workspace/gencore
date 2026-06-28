// file: packages/ai/src/application/services/ai-session-feedback-service.ts

import { Scoped } from "@genspire/core";
import type { ICreateOrUpdateAiMessageFeedbackInput } from "../contracts/ai-session-contracts.js";
import { AiSessionMessageFeedbackEntity } from "../../domain/session/index.js";
import { AiSessionDbContext } from "../../infrastructure/persistence/ai-session-db-context.js";
import {
  requireAccessibleSession,
  requireMessageInSession,
  toFeedbackResponse,
  validateFeedbackRating,
} from "./ai-session-shared.js";

@Scoped()
export class AiSessionFeedbackService {
  static inject = [AiSessionDbContext];

  constructor(private readonly db: AiSessionDbContext) {}

  async createOrUpdate(input: ICreateOrUpdateAiMessageFeedbackInput) {
    validateFeedbackRating(input.rating);
    const session = await requireAccessibleSession(this.db, input.currentUser, input.sessionId);
    const message = await requireMessageInSession(this.db, session, input.messageId);

    const existing = await this.db.messageFeedback.findOne({
      messageId: message.id,
      userId: input.currentUser.id,
    } as Partial<AiSessionMessageFeedbackEntity>);

    const feedback = existing ?? new AiSessionMessageFeedbackEntity();
    if (!existing) {
      feedback.id = crypto.randomUUID();
      feedback.sessionId = session.id;
      feedback.messageId = message.id;
      feedback.userId = input.currentUser.id;
      feedback.createdAt = new Date();
      await this.db.messageFeedback.add(feedback);
    }

    feedback.rating = input.rating;
    feedback.comment = input.comment ?? null;
    feedback.metadata = input.metadata ?? null;
    feedback.updatedAt = new Date();

    await this.db.messageFeedback.update(feedback);
    await this.db.saveChanges();
    return toFeedbackResponse(feedback);
  }
}
