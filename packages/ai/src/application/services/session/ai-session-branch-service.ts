// file: packages\ai\src\application\services\session\branch-service.ts

import { Scoped } from "@genspire/core";
import type { ICurrentUser } from "@genspire/auth";
import type { ICreateAiBranchInput } from "../../contracts/ai-session-contracts.js";
import { AiSessionBranchEntity, AiSessionTimelineEntity } from "../../../domain/session/index.js";
import { AiSessionDbContext } from "../../../infrastructure/persistence/ai-session-db-context.js";
import {
  cloneTimelinePrefix,
  getTimelineTurnByTurn,
  requireAccessibleSession,
  requireTimelineInSession,
  requireTurnInSession,
  toBranchResponse,
  toTimelineResponse,
} from "./shared.js";

@Scoped()
export class AiSessionBranchService {
  static inject = [AiSessionDbContext];

  constructor(private readonly db: AiSessionDbContext) {}

  async list(currentUser: ICurrentUser, sessionId: string) {
    const session = await requireAccessibleSession(this.db, currentUser, sessionId);
    const branches = await this.db.branches.list({
      where: { sessionId: session.id } as Partial<AiSessionBranchEntity>,
      orderBy: "createdAt",
      direction: "asc",
    });
    return { items: branches.map(toBranchResponse) };
  }

  async create(input: ICreateAiBranchInput) {
    const session = await requireAccessibleSession(this.db, input.currentUser, input.sessionId);
    await requireTimelineInSession(this.db, session, input.sourceTimelineId);
    await requireTurnInSession(this.db, session, input.sourceTurnId);

    const sourceTimelineTurn = await getTimelineTurnByTurn(
      this.db,
      input.sourceTimelineId,
      input.sourceTurnId,
    );
    if (!sourceTimelineTurn) {
      throw new Error("Source turn is not attached to the requested timeline.");
    }

    const now = new Date();
    const targetTimeline = new AiSessionTimelineEntity();
    targetTimeline.id = crypto.randomUUID();
    targetTimeline.sessionId = session.id;
    targetTimeline.name = input.name?.trim() ? input.name.trim() : "Branch";
    targetTimeline.isDefault = false;
    targetTimeline.metadata = input.metadata ?? null;
    targetTimeline.createdAt = now;
    targetTimeline.updatedAt = now;

    const branch = new AiSessionBranchEntity();
    branch.id = crypto.randomUUID();
    branch.sessionId = session.id;
    branch.sourceTimelineId = input.sourceTimelineId;
    branch.sourceTurnId = input.sourceTurnId;
    branch.sourceTurnIndex = sourceTimelineTurn.index;
    branch.targetTimelineId = targetTimeline.id;
    branch.reason = input.reason ?? "manual_branch";
    branch.metadata = input.metadata ?? null;
    branch.createdAt = now;
    branch.updatedAt = now;

    await this.db.timelines.add(targetTimeline);
    await cloneTimelinePrefix(
      this.db,
      input.sourceTimelineId,
      targetTimeline.id,
      session.id,
      sourceTimelineTurn.index,
      "branch_copy",
    );
    await this.db.branches.add(branch);
    await this.db.saveChanges();

    return {
      branch: toBranchResponse(branch),
      timeline: toTimelineResponse(targetTimeline),
    };
  }
}
