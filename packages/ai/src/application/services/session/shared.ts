// file: packages\ai\src\application\services\session\shared.ts

import { GenError } from "@genspire/core";
import type { ICurrentUser } from "@genspire/auth";
import type { IChatMessage } from "../../../domain/chat/chat-message.js";
import type { IAiTool } from "../../../domain/tools/ai-tool.js";
import {
  AiGenerationRunEntity,
  AiSessionBranchEntity,
  AiSessionEntity,
  AiSessionMessageEntity,
  AiSessionMessageFeedbackEntity,
  AiSessionTimelineEntity,
  AiSessionTimelineTurnEntity,
  AiSessionTurnEntity,
  type IAiSessionSettings,
} from "../../../domain/session/index.js";
import type { IChatGenerationSettings } from "../../../domain/chat/chat-generation-settings.js";
import { AiSessionDbContext } from "../../../infrastructure/persistence/ai-session-db-context.js";

export interface IAiSessionTurnSnapshot {
  timelineTurn: AiSessionTimelineTurnEntity;
  turn: AiSessionTurnEntity;
  messages: AiSessionMessageEntity[];
}

export function isAdmin(currentUser: ICurrentUser | null | undefined): boolean {
  return Boolean(currentUser?.roles?.some((role) => role.toLowerCase() === "admin"));
}

export async function requireAccessibleSession(
  db: AiSessionDbContext,
  currentUser: ICurrentUser,
  sessionId: string,
): Promise<AiSessionEntity> {
  const session = await db.sessions.findById(sessionId);
  if (!session || (session.userId !== currentUser.id && !isAdmin(currentUser))) {
    throw new GenError("AI session not found.", "AI_SESSION_NOT_FOUND");
  }
  return session;
}

export async function requireTimelineInSession(
  db: AiSessionDbContext,
  session: AiSessionEntity,
  timelineId: string,
): Promise<AiSessionTimelineEntity> {
  const timeline = await db.timelines.findById(timelineId);
  if (!timeline || timeline.sessionId !== session.id) {
    throw new GenError("AI session timeline not found.", "AI_TIMELINE_NOT_FOUND");
  }
  return timeline;
}

export async function requireTurnInSession(
  db: AiSessionDbContext,
  session: AiSessionEntity,
  turnId: string,
): Promise<AiSessionTurnEntity> {
  const turn = await db.turns.findById(turnId);
  if (!turn || turn.sessionId !== session.id) {
    throw new GenError("AI session turn not found.", "AI_TURN_NOT_FOUND");
  }
  return turn;
}

export async function requireMessageInSession(
  db: AiSessionDbContext,
  session: AiSessionEntity,
  messageId: string,
): Promise<AiSessionMessageEntity> {
  const message = await db.messages.findById(messageId);
  if (!message || message.sessionId !== session.id) {
    throw new GenError("AI session message not found.", "AI_MESSAGE_NOT_FOUND");
  }
  return message;
}

export async function listTimelineTurns(
  db: AiSessionDbContext,
  timelineId: string,
): Promise<AiSessionTimelineTurnEntity[]> {
  return await db.timelineTurns.list({
    where: { timelineId } as Partial<AiSessionTimelineTurnEntity>,
    orderBy: "index",
    direction: "asc",
  });
}

export async function listTurnMessages(
  db: AiSessionDbContext,
  turnId: string,
): Promise<AiSessionMessageEntity[]> {
  return await db.messages.list({
    where: { turnId } as Partial<AiSessionMessageEntity>,
    orderBy: "index",
    direction: "asc",
  });
}

export async function listTimelineTurnSnapshots(
  db: AiSessionDbContext,
  timelineId: string,
): Promise<IAiSessionTurnSnapshot[]> {
  const timelineTurns = await listTimelineTurns(db, timelineId);
  const snapshots: IAiSessionTurnSnapshot[] = [];

  for (const timelineTurn of timelineTurns) {
    const turn = await db.turns.findById(timelineTurn.turnId);
    if (!turn) {
      continue;
    }
    const messages = await listTurnMessages(db, turn.id);
    snapshots.push({ timelineTurn, turn, messages });
  }

  return snapshots;
}

export function nextIndex<TEntity extends { index: number }>(items: readonly TEntity[]): number {
  return items.length === 0
    ? 0
    : Math.max(...items.map((item) => item.index)) + 1;
}

export function toChatMessages(messages: readonly AiSessionMessageEntity[]): IChatMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content as IChatMessage["content"],
    ...(message.name ? { name: message.name } : {}),
    ...(message.metadata ? { metadata: message.metadata } : {}),
  }));
}

export function resolveGenerationSettings(
  sessionSettings: IAiSessionSettings | null | undefined,
  settings: (IChatGenerationSettings & { stream?: boolean }) | undefined,
): IChatGenerationSettings | undefined {
  const merged: Record<string, unknown> = {
    ...(sessionSettings?.generation ?? {}),
    ...(settings ?? {}),
  };
  delete merged["stream"];
  return Object.keys(merged).length === 0
    ? undefined
    : (merged as IChatGenerationSettings);
}

export function resolveProvider(
  sessionSettings: IAiSessionSettings | null | undefined,
  provider?: string,
): string | undefined {
  return provider ?? sessionSettings?.provider;
}

export function resolveModel(
  sessionSettings: IAiSessionSettings | null | undefined,
  model?: string,
): string | undefined {
  return model ?? sessionSettings?.model;
}

export function resolveSystemPrompt(
  sessionSettings: IAiSessionSettings | null | undefined,
  systemPrompt?: string,
): string | undefined {
  return systemPrompt ?? sessionSettings?.systemPrompt;
}

export function ensureStreamEnabled(
  settings: { stream?: boolean } | undefined,
): void {
  if (settings?.stream === false) {
    throw new GenError(
      "Streaming is required for session-bound generation.",
      "AI_STREAM_REQUIRED",
    );
  }
}

export function validateFeedbackRating(rating: string): asserts rating is "good" | "bad" {
  if (rating !== "good" && rating !== "bad") {
    throw new GenError(
      "Feedback rating must be 'good' or 'bad'.",
      "AI_FEEDBACK_VALIDATION_ERROR",
    );
  }
}

export function validateSessionTitle(title: string | null | undefined): string | null {
  if (title == null) {
    return null;
  }
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function validateSessionContent(content: unknown): void {
  if (content === undefined || content === null) {
    throw new GenError("Message content is required.", "AI_SESSION_VALIDATION_ERROR");
  }
}

export async function getTimelineTurnByTurn(
  db: AiSessionDbContext,
  timelineId: string,
  turnId: string,
): Promise<AiSessionTimelineTurnEntity | null> {
  const timelineTurns = await db.timelineTurns.list({
    where: { timelineId } as Partial<AiSessionTimelineTurnEntity>,
    orderBy: "index",
    direction: "asc",
  });
  return timelineTurns.find((item) => item.turnId === turnId) ?? null;
}

export async function cloneTimelinePrefix(
  db: AiSessionDbContext,
  sourceTimelineId: string,
  targetTimelineId: string,
  sessionId: string,
  inclusiveTurnIndex: number,
  source: AiSessionTimelineTurnEntity["source"],
): Promise<AiSessionTimelineTurnEntity[]> {
  const sourceTimelineTurns = await listTimelineTurns(db, sourceTimelineId);
  const copied = sourceTimelineTurns
    .filter((item) => item.index <= inclusiveTurnIndex)
    .map((item) => {
      const edge = new AiSessionTimelineTurnEntity();
      edge.id = crypto.randomUUID();
      edge.sessionId = sessionId;
      edge.timelineId = targetTimelineId;
      edge.turnId = item.turnId;
      edge.index = item.index;
      edge.source = source;
      edge.createdAt = new Date();
      edge.updatedAt = new Date();
      return edge;
    });

  for (const item of copied) {
    await db.timelineTurns.add(item);
  }

  return copied;
}

export function toIso(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined;
}

export function toMessageResponse(message: AiSessionMessageEntity) {
  return {
    id: message.id,
    sessionId: message.sessionId,
    turnId: message.turnId,
    index: message.index,
    role: message.role,
    content: message.content,
    name: message.name ?? undefined,
    provider: message.provider ?? undefined,
    model: message.model ?? undefined,
    usage: message.usage ?? undefined,
    toolCalls: message.toolCalls ?? undefined,
    toolResults: message.toolResults ?? undefined,
    metadata: message.metadata ?? undefined,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
  };
}

export function toTurnResponse(turn: AiSessionTurnEntity) {
  return {
    id: turn.id,
    sessionId: turn.sessionId,
    status: turn.status,
    provider: turn.provider ?? undefined,
    model: turn.model ?? undefined,
    startedAt: toIso(turn.startedAt),
    finishedAt: toIso(turn.finishedAt),
    durationMs: turn.durationMs ?? undefined,
    finishReason: turn.finishReason ?? undefined,
    error: turn.error ?? undefined,
    metadata: turn.metadata ?? undefined,
    createdAt: turn.createdAt.toISOString(),
    updatedAt: turn.updatedAt.toISOString(),
  };
}

export function toTimelineResponse(timeline: AiSessionTimelineEntity) {
  return {
    id: timeline.id,
    sessionId: timeline.sessionId,
    name: timeline.name ?? undefined,
    isDefault: timeline.isDefault,
    metadata: timeline.metadata ?? undefined,
    createdAt: timeline.createdAt.toISOString(),
    updatedAt: timeline.updatedAt.toISOString(),
  };
}

export function toTimelineTurnResponse(timelineTurn: AiSessionTimelineTurnEntity) {
  return {
    id: timelineTurn.id,
    sessionId: timelineTurn.sessionId,
    timelineId: timelineTurn.timelineId,
    turnId: timelineTurn.turnId,
    index: timelineTurn.index,
    source: timelineTurn.source,
    createdAt: timelineTurn.createdAt.toISOString(),
    updatedAt: timelineTurn.updatedAt.toISOString(),
  };
}

export function toSessionResponse(session: AiSessionEntity) {
  return {
    id: session.id,
    userId: session.userId,
    title: session.title ?? undefined,
    type: session.type,
    defaultTimelineId: session.defaultTimelineId ?? undefined,
    settings: session.settings ?? undefined,
    metadata: session.metadata ?? undefined,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

export function toFeedbackResponse(feedback: AiSessionMessageFeedbackEntity) {
  return {
    id: feedback.id,
    sessionId: feedback.sessionId,
    messageId: feedback.messageId,
    userId: feedback.userId,
    rating: feedback.rating,
    comment: feedback.comment ?? null,
    metadata: feedback.metadata ?? undefined,
    createdAt: feedback.createdAt.toISOString(),
    updatedAt: feedback.updatedAt.toISOString(),
  };
}

export function toBranchResponse(branch: AiSessionBranchEntity) {
  return {
    id: branch.id,
    sessionId: branch.sessionId,
    sourceTimelineId: branch.sourceTimelineId,
    sourceTurnId: branch.sourceTurnId,
    sourceTurnIndex: branch.sourceTurnIndex,
    targetTimelineId: branch.targetTimelineId,
    reason: branch.reason,
    metadata: branch.metadata ?? undefined,
    createdAt: branch.createdAt.toISOString(),
    updatedAt: branch.updatedAt.toISOString(),
  };
}

export function toGenerationRunResponse(run: AiGenerationRunEntity) {
  return {
    id: run.id,
    sessionId: run.sessionId,
    timelineId: run.timelineId,
    turnId: run.turnId,
    status: run.status,
    provider: run.provider ?? undefined,
    model: run.model ?? undefined,
    startedAt: toIso(run.startedAt),
    finishedAt: toIso(run.finishedAt),
    durationMs: run.durationMs ?? undefined,
    finishReason: run.finishReason ?? undefined,
    usage: run.usage ?? undefined,
    error: run.error ?? undefined,
    metadata: run.metadata ?? undefined,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  };
}

export function toToolDefinitions(
  tools: IAiTool[] | undefined,
): IAiTool[] | undefined {
  if (!tools?.length) {
    return undefined;
  }

  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    returnDirect: tool.returnDirect,
    metadata: tool.metadata,
  }));
}
