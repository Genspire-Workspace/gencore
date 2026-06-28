// file: packages/ai/src/application/services/ai-session-service.ts

import { Scoped } from "@genspire/core";
import type {
  ICreateAiSessionInput,
  IUpdateAiSessionInput,
} from "../contracts/ai-session-contracts.js";
import { AiSessionEntity, AiSessionTimelineEntity } from "../../domain/session/index.js";
import { AiSessionDbContext } from "../../infrastructure/persistence/ai-session-db-context.js";
import {
  requireAccessibleSession,
  toSessionResponse,
  toTimelineResponse,
  validateSessionTitle,
} from "./ai-session-shared.js";

@Scoped()
export class AiSessionService {
  static inject = [AiSessionDbContext];

  constructor(private readonly db: AiSessionDbContext) {}

  async list(currentUser: ICreateAiSessionInput["currentUser"]) {
    const sessions = await this.db.sessions.list({
      where: currentUser.roles.some((role) => role.toLowerCase() === "admin")
        ? undefined
        : ({ userId: currentUser.id } as Partial<AiSessionEntity>),
      orderBy: "updatedAt",
      direction: "desc",
    });

    return { items: sessions.map(toSessionResponse) };
  }

  async getById(currentUser: ICreateAiSessionInput["currentUser"], sessionId: string) {
    return toSessionResponse(
      await requireAccessibleSession(this.db, currentUser, sessionId),
    );
  }

  async create(input: ICreateAiSessionInput) {
    const now = new Date();
    const session = new AiSessionEntity();
    session.id = crypto.randomUUID();
    session.userId = input.currentUser.id;
    session.title = validateSessionTitle(input.title);
    session.type = input.type ?? "chat";
    session.settings = input.settings ?? null;
    session.metadata = input.metadata ?? null;
    session.createdAt = now;
    session.updatedAt = now;

    const timeline = new AiSessionTimelineEntity();
    timeline.id = crypto.randomUUID();
    timeline.sessionId = session.id;
    timeline.name = "Main";
    timeline.isDefault = true;
    timeline.metadata = null;
    timeline.createdAt = now;
    timeline.updatedAt = now;

    session.defaultTimelineId = timeline.id;

    await this.db.sessions.add(session);
    await this.db.timelines.add(timeline);
    await this.db.saveChanges();

    return {
      ...toSessionResponse(session),
      defaultTimeline: toTimelineResponse(timeline),
    };
  }

  async update(input: IUpdateAiSessionInput) {
    const session = await requireAccessibleSession(
      this.db,
      input.currentUser,
      input.sessionId,
    );

    if (input.title !== undefined) {
      session.title = validateSessionTitle(input.title);
    }
    if (input.type !== undefined) {
      session.type = input.type;
    }
    if (input.settings !== undefined) {
      session.settings = input.settings;
    }
    if (input.metadata !== undefined) {
      session.metadata = input.metadata;
    }
    session.updatedAt = new Date();

    await this.db.sessions.update(session);
    await this.db.saveChanges();
    return toSessionResponse(session);
  }
}
