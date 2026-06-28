// file: packages/ai/src/application/services/ai-session-graph-service.ts

import { Scoped } from "@genspire/core";
import type { IGetAiSessionGraphInput } from "../contracts/ai-session-contracts.js";
import {
  AiGenerationRunEntity,
  AiSessionBranchEntity,
  AiSessionMessageEntity,
  AiSessionMessageFeedbackEntity,
  AiSessionTimelineEntity,
  AiSessionTimelineTurnEntity,
  AiSessionTurnEntity,
} from "../../domain/session/index.js";
import { AiSessionDbContext } from "../../infrastructure/persistence/ai-session-db-context.js";
import {
  requireAccessibleSession,
  requireTimelineInSession,
  toBranchResponse,
  toFeedbackResponse,
  toGenerationRunResponse,
  toMessageResponse,
  toSessionResponse,
  toTimelineResponse,
  toTimelineTurnResponse,
  toTurnResponse,
} from "./ai-session-shared.js";

@Scoped()
export class AiSessionGraphService {
  static inject = [AiSessionDbContext];

  constructor(private readonly db: AiSessionDbContext) {}

  async getGraph(input: IGetAiSessionGraphInput) {
    const session = await requireAccessibleSession(this.db, input.currentUser, input.sessionId);

    if (input.timelineId) {
      await requireTimelineInSession(this.db, session, input.timelineId);
    }

    const allTimelines = await this.db.timelines.list({
      where: { sessionId: session.id } as Partial<AiSessionTimelineEntity>,
      orderBy: "createdAt",
      direction: "asc",
    });
    const selectedTimelines = input.timelineId
      ? allTimelines.filter((timeline) => timeline.id === input.timelineId)
      : allTimelines;

    const timelineIds = new Set(selectedTimelines.map((timeline) => timeline.id));
    const allTimelineTurns = await this.db.timelineTurns.list({
      where: { sessionId: session.id } as Partial<AiSessionTimelineTurnEntity>,
      orderBy: "createdAt",
      direction: "asc",
    });
    const timelineTurns = allTimelineTurns.filter((item) => timelineIds.has(item.timelineId));

    const turnIds = new Set(timelineTurns.map((item) => item.turnId));
    const turns = (await this.db.turns.list({
      where: { sessionId: session.id } as Partial<AiSessionTurnEntity>,
      orderBy: "createdAt",
      direction: "asc",
    })).filter((turn) => turnIds.has(turn.id));
    const messages = (await this.db.messages.list({
      where: { sessionId: session.id } as Partial<AiSessionMessageEntity>,
      orderBy: "createdAt",
      direction: "asc",
    })).filter((message) => turnIds.has(message.turnId));
    const messageIds = new Set(messages.map((message) => message.id));
    const feedback = (await this.db.messageFeedback.list({
      where: { sessionId: session.id } as Partial<AiSessionMessageFeedbackEntity>,
      orderBy: "createdAt",
      direction: "asc",
    })).filter((item) => messageIds.has(item.messageId));
    const branches = (await this.db.branches.list({
      where: { sessionId: session.id } as Partial<AiSessionBranchEntity>,
      orderBy: "createdAt",
      direction: "asc",
    })).filter((branch) => (
      input.timelineId
        ? branch.sourceTimelineId === input.timelineId || branch.targetTimelineId === input.timelineId
        : true
    ));
    const generationRuns = (await this.db.generationRuns.list({
      where: { sessionId: session.id } as Partial<AiGenerationRunEntity>,
      orderBy: "createdAt",
      direction: "asc",
    })).filter((run) => turnIds.has(run.turnId));

    return {
      session: toSessionResponse(session),
      timelines: selectedTimelines.map(toTimelineResponse),
      timelineTurns: timelineTurns.map(toTimelineTurnResponse),
      turns: turns.map(toTurnResponse),
      messages: messages.map(toMessageResponse),
      feedback: feedback.map(toFeedbackResponse),
      branches: branches.map(toBranchResponse),
      generationRuns: generationRuns.map(toGenerationRunResponse),
    };
  }
}
