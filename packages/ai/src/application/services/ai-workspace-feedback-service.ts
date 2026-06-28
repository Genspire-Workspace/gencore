// file: packages/ai/src/application/services/ai-workspace-feedback-service.ts

import { Scoped } from "@genspire/core";
import type { ICreateOrUpdateAiMessageFeedbackInput } from "../contracts/ai-workspace-contracts.js";
import { AiSessionMessageFeedbackEntity } from "../../domain/workspace/index.js";
import { AiWorkspaceDbContext } from "../../infrastructure/persistence/ai-workspace-db-context.js";
import {
  requireAccessibleSession,
  requireMessageInSession,
  toFeedbackResponse,
  validateFeedbackRating,
} from "./ai-workspace-shared.js";

@Scoped()
export class AiWorkspaceFeedbackService {
  static inject = [AiWorkspaceDbContext];

  constructor(private readonly db: AiWorkspaceDbContext) {}

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
