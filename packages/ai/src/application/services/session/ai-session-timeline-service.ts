// file: packages\ai\src\application\services\session\timeline-service.ts

import { Scoped } from "@genspire/core";
import type { ICurrentUser } from "@genspire/auth";
import type { ICreateAiTimelineInput } from "../../contracts/ai-session-contracts.js";
import { AiSessionTimelineEntity } from "../../../domain/session/index.js";
import { AiSessionDbContext } from "../../../infrastructure/persistence/ai-session-db-context.js";
import {
  listTimelineTurnSnapshots,
  requireAccessibleSession,
  requireTimelineInSession,
  toGenerationRunResponse,
  toMessageResponse,
  toTimelineResponse,
  toTimelineTurnResponse,
  toTurnResponse,
} from "./shared.js";

@Scoped()
export class AiSessionTimelineService {
  static inject = [AiSessionDbContext];

  constructor(private readonly db: AiSessionDbContext) {}

  async list(currentUser: ICurrentUser, sessionId: string) {
    const session = await requireAccessibleSession(this.db, currentUser, sessionId);
    const timelines = await this.db.timelines.list({
      where: { sessionId: session.id } as Partial<AiSessionTimelineEntity>,
      orderBy: "createdAt",
      direction: "asc",
    });
    return { items: timelines.map(toTimelineResponse) };
  }

  async create(input: ICreateAiTimelineInput) {
    const session = await requireAccessibleSession(this.db, input.currentUser, input.sessionId);
    const now = new Date();
    const timeline = new AiSessionTimelineEntity();
    timeline.id = crypto.randomUUID();
    timeline.sessionId = session.id;
    timeline.name = input.name?.trim() ? input.name.trim() : null;
    timeline.isDefault = false;
    timeline.metadata = input.metadata ?? null;
    timeline.createdAt = now;
    timeline.updatedAt = now;

    await this.db.timelines.add(timeline);
    await this.db.saveChanges();
    return toTimelineResponse(timeline);
  }

  async listTurns(currentUser: ICurrentUser, sessionId: string, timelineId: string) {
    const session = await requireAccessibleSession(this.db, currentUser, sessionId);
    await requireTimelineInSession(this.db, session, timelineId);

    const snapshots = await listTimelineTurnSnapshots(this.db, timelineId);
    const runList = await this.db.generationRuns.list({
      where: { sessionId } as Record<string, unknown>,
      orderBy: "createdAt",
      direction: "asc",
    });

    return {
      items: snapshots.map((snapshot) => ({
        timelineTurn: toTimelineTurnResponse(snapshot.timelineTurn),
        turn: toTurnResponse(snapshot.turn),
        messages: snapshot.messages.map(toMessageResponse),
        generationRuns: runList
          .filter((run) => run.turnId === snapshot.turn.id)
          .map(toGenerationRunResponse),
      })),
    };
  }
}
