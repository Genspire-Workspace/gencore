import { describe, expect, test } from "bun:test";
import { AiSessionWorkspaceManager } from "./ai-session-workspace-manager.js";
import type {
  IAiSessionGraphDto,
  IAiSessionResponseDto,
  IAiSessionStreamEvent,
} from "../../domain/types/ai-session-sdk-types.js";
import type { IAiSessionTransport } from "../contracts/ai-session-transport.js";

function createSession(
  id: string,
  defaultTimelineId: string,
  title = "Session",
): IAiSessionResponseDto {
  const now = new Date().toISOString();
  return {
    id,
    userId: "user-1",
    title,
    type: "chat",
    defaultTimelineId,
    createdAt: now,
    updatedAt: now,
  };
}

function createGraph(session: IAiSessionResponseDto): IAiSessionGraphDto {
  const now = new Date().toISOString();
  return {
    session,
    timelines: [
      {
        id: session.defaultTimelineId!,
        sessionId: session.id,
        name: "Main",
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    timelineTurns: [
      {
        id: "timeline-turn-1",
        sessionId: session.id,
        timelineId: session.defaultTimelineId!,
        turnId: "turn-1",
        index: 0,
        source: "original",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "timeline-turn-2",
        sessionId: session.id,
        timelineId: session.defaultTimelineId!,
        turnId: "turn-2",
        index: 1,
        source: "original",
        createdAt: now,
        updatedAt: now,
      },
    ],
    turns: [
      {
        id: "turn-1",
        sessionId: session.id,
        status: "completed",
        finishReason: "stop",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "turn-2",
        sessionId: session.id,
        status: "completed",
        finishReason: "stop",
        createdAt: now,
        updatedAt: now,
      },
    ],
    messages: [
      {
        id: "user-1",
        sessionId: session.id,
        turnId: "turn-1",
        index: 0,
        role: "user",
        content: "Question 1",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "assistant-1",
        sessionId: session.id,
        turnId: "turn-1",
        index: 1,
        role: "assistant",
        content: "Answer 1",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-2",
        sessionId: session.id,
        turnId: "turn-2",
        index: 0,
        role: "user",
        content: "Question 2",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "assistant-2",
        sessionId: session.id,
        turnId: "turn-2",
        index: 1,
        role: "assistant",
        content: "Answer 2",
        createdAt: now,
        updatedAt: now,
      },
    ],
    feedback: [],
    branches: [],
    generationRuns: [],
  };
}

function createTransport(
  overrides: Partial<IAiSessionTransport>,
  session: IAiSessionResponseDto,
  graph: IAiSessionGraphDto,
): IAiSessionTransport {
  return {
    async listSessions() {
      return [session];
    },
    async createSession() {
      return session;
    },
    async getSession() {
      return session;
    },
    async deleteSession() {
      return { deleted: true, id: session.id };
    },
    async updateSession() {
      return session;
    },
    async getSessionGraph() {
      return graph;
    },
    async createFeedback() {
      return {
        id: "feedback-1",
        sessionId: session.id,
        messageId: "assistant-2",
        userId: "user-1",
        rating: "good",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    async createBranch() {
      throw new Error("Not implemented in test transport.");
    },
    async createSessionBranch() {
      throw new Error("Not implemented in test transport.");
    },
    async streamMessage() {
      throw new Error("Not implemented in test transport.");
    },
    async regenerateAssistant() {
      throw new Error("Not implemented in test transport.");
    },
    async editUserAndRegenerate() {
      throw new Error("Not implemented in test transport.");
    },
    ...overrides,
  };
}

describe("AiSessionWorkspaceManager", () => {
  test("regenerate creates an optimistic branch and promotes it without a refresh", async () => {
    const session = createSession("session-1", "timeline-main");
    const graph = createGraph(session);
    let graphFetchCount = 0;

    let manager!: AiSessionWorkspaceManager;
    const transport = createTransport(
      {
        async getSessionGraph() {
          graphFetchCount += 1;
          return graph;
        },
        async regenerateAssistant(_sessionId, _timelineId, _input, onChunk) {
          const optimisticState = manager.getCurrentSessionState();
          expect(optimisticState?.activeTimelineId).not.toBe("timeline-main");
          expect(
            optimisticState?.messages.map((message) => `${message.role}:${String(message.content)}`),
          ).toEqual([
            "user:Question 1",
            "assistant:Answer 1",
            "user:Question 2",
            "assistant:",
          ]);
          expect(optimisticState?.messages.at(-1)?.pending).toBe(true);

          const started: IAiSessionStreamEvent = {
            type: "started",
            sessionId: session.id,
            timelineId: "timeline-branch",
            turnId: "turn-branch",
            timelineTurnId: "timeline-turn-branch",
            messageId: "user-branch",
            timeline: {
              id: "timeline-branch",
              sessionId: session.id,
              name: "Assistant regeneration",
              isDefault: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            branch: {
              id: "branch-1",
              sessionId: session.id,
              sourceTimelineId: "timeline-main",
              sourceTurnId: "turn-2",
              sourceTurnIndex: 1,
              targetTimelineId: "timeline-branch",
              reason: "assistant_regeneration",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          };

          onChunk(started);
          onChunk({
            type: "delta",
            sessionId: session.id,
            timelineId: "timeline-branch",
            turnId: "turn-branch",
            delta: "Updated ",
          });
          onChunk({
            type: "message",
            sessionId: session.id,
            timelineId: "timeline-branch",
            turnId: "turn-branch",
            messageId: "assistant-branch",
            message: {
              id: "assistant-branch",
              sessionId: session.id,
              turnId: "turn-branch",
              index: 1,
              role: "assistant",
              content: "Updated answer",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          });
          onChunk({
            type: "completed",
            sessionId: session.id,
            timelineId: "timeline-branch",
            turnId: "turn-branch",
            finishReason: "stop",
          });
        },
      },
      session,
      graph,
    );

    manager = new AiSessionWorkspaceManager(transport, {
      defaultProvider: "provider-1",
      defaultModel: "model-1",
    });

    await manager.openSession(session.id);
    await manager.regenerateAssistantMessage(
      manager.getCurrentSessionState()!.messages.find((message) => message.id === "assistant-2")!,
    );

    const state = manager.getCurrentSessionState()!;
    expect(state.activeTimelineId).toBe("timeline-branch");
    expect(state.optimisticGraph).toBeNull();
    expect(
      state.messages.map((message) => `${message.id}:${message.role}:${String(message.content)}`),
    ).toEqual([
      "user-1:user:Question 1",
      "assistant-1:assistant:Answer 1",
      "user-branch:user:Question 2",
      "assistant-branch:assistant:Updated answer",
    ]);
    expect(graphFetchCount).toBe(1);
  });

  test("edit rollback removes the optimistic branch when the stream fails before started", async () => {
    const session = createSession("session-1", "timeline-main");
    const graph = createGraph(session);

    const manager = new AiSessionWorkspaceManager(
      createTransport(
        {
          async editUserAndRegenerate() {
            throw new Error("failed before started");
          },
        },
        session,
        graph,
      ),
      {
        defaultProvider: "provider-1",
        defaultModel: "model-1",
      },
    );

    await manager.openSession(session.id);
    const userMessage = manager.getCurrentSessionState()!.messages.find(
      (message) => message.id === "user-2",
    )!;
    manager.beginEditMessage(userMessage);
    manager.setCurrentPrompt("Edited question");

    await expect(manager.sendMessage()).rejects.toThrow("failed before started");

    const state = manager.getCurrentSessionState()!;
    expect(state.activeTimelineId).toBe("timeline-main");
    expect(state.optimisticGraph).toBeNull();
    expect(state.messages.map((message) => `${message.id}:${String(message.content)}`)).toEqual([
      "user-1:Question 1",
      "assistant-1:Answer 1",
      "user-2:Question 2",
      "assistant-2:Answer 2",
    ]);
  });

  test("manual branch opens the returned cloned session graph", async () => {
    const session = createSession("session-1", "timeline-main");
    const graph = createGraph(session);
    const branchedSession = createSession("session-2", "timeline-new", "Branched");
    const branchedGraph: IAiSessionGraphDto = {
      ...createGraph(branchedSession),
      timelineTurns: createGraph(branchedSession).timelineTurns.slice(0, 1),
      turns: createGraph(branchedSession).turns.slice(0, 1),
      messages: createGraph(branchedSession).messages.slice(0, 2),
    };

    const manager = new AiSessionWorkspaceManager(
      createTransport(
        {
          async listSessions() {
            return [branchedSession, session];
          },
          async createSessionBranch() {
            return {
              session: branchedSession,
              graph: branchedGraph,
            };
          },
        },
        session,
        graph,
      ),
      {},
    );

    await manager.openSession(session.id);
    await manager.branchFromMessage(
      manager.getCurrentSessionState()!.messages.find((message) => message.id === "assistant-1")!,
    );

    expect(manager.getSelectedSessionId()).toBe("session-2");
    expect(
      manager.getCurrentSessionState()!.messages.map((message) => `${message.role}:${String(message.content)}`),
    ).toEqual([
      "user:Question 1",
      "assistant:Answer 1",
    ]);
  });
});
