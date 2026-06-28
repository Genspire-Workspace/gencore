// file: packages/ai/src/infrastructure/persistence/ai-session-db-context.ts

import { Scoped } from "@genspire/core";
import { EntityManagerProvider, MikroOrmDbContext } from "@genspire/data-mikroorm";
import {
  AiGenerationRunEntity,
  AiSessionBranchEntity,
  AiSessionEntity,
  AiSessionMessageEntity,
  AiSessionMessageFeedbackEntity,
  AiSessionTimelineEntity,
  AiSessionTimelineTurnEntity,
  AiSessionTurnEntity,
} from "../../domain/session/index.js";

@Scoped()
export class AiSessionDbContext extends MikroOrmDbContext {
  static inject = [EntityManagerProvider];

  readonly sessions = this.set<AiSessionEntity, string>(AiSessionEntity);
  readonly timelines = this.set<AiSessionTimelineEntity, string>(AiSessionTimelineEntity);
  readonly timelineTurns = this.set<AiSessionTimelineTurnEntity, string>(AiSessionTimelineTurnEntity);
  readonly turns = this.set<AiSessionTurnEntity, string>(AiSessionTurnEntity);
  readonly messages = this.set<AiSessionMessageEntity, string>(AiSessionMessageEntity);
  readonly messageFeedback = this.set<AiSessionMessageFeedbackEntity, string>(AiSessionMessageFeedbackEntity);
  readonly branches = this.set<AiSessionBranchEntity, string>(AiSessionBranchEntity);
  readonly generationRuns = this.set<AiGenerationRunEntity, string>(AiGenerationRunEntity);

  constructor(entityManagerProvider: EntityManagerProvider) {
    super(entityManagerProvider);
  }
}
