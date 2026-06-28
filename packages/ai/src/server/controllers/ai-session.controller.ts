// file: packages/ai/src/server/controllers/ai-session.controller.ts

import {
  Authorize,
  Controller,
  Get,
  Patch,
  Post,
  RequestContext,
  defineProblemDetailsType,
  json,
  problem,
} from "@genspire/server";
import { requireCurrentUser } from "@genspire/auth";
import { GenError } from "@genspire/core";
import type { IChatGenerationSettings } from "../../domain/chat/chat-generation-settings.js";
import type { IAiTool } from "../../domain/tools/ai-tool.js";
import { AiSessionBranchService } from "../../application/services/ai-session-branch-service.js";
import { AiSessionFeedbackService } from "../../application/services/ai-session-feedback-service.js";
import { AiSessionGenerationService } from "../../application/services/ai-session-generation-service.js";
import { AiSessionGraphService } from "../../application/services/ai-session-graph-service.js";
import { AiSessionService } from "../../application/services/ai-session-service.js";
import { AiSessionTimelineService } from "../../application/services/ai-session-timeline-service.js";
import { AiSseEventDto } from "../dtos/ai-admin.dto.js";
import {
  CreateAiBranchResponseDto,
  AiSessionBranchListResponseDto,
  AiSessionMessageFeedbackResponseDto,
  AiSessionGraphDto,
  AiSessionListResponseDto,
  AiSessionResponseDto,
  AiSessionTimelineListResponseDto,
  AiSessionTimelineResponseDto,
  AiSessionTimelineTurnListResponseDto,
  CreateAiBranchRequestDto,
  CreateAiMessageFeedbackRequestDto,
  CreateAiSessionRequestDto,
  CreateAiTimelineRequestDto,
  EditAiUserAndRegenerateRequestDto,
  GenerateAiSessionTurnRequestDto,
  RegenerateAiAssistantRequestDto,
  UpdateAiSessionRequestDto,
} from "../dtos/ai-session.dto.js";

function toTools(tools: GenerateAiSessionTurnRequestDto["tools"]): IAiTool[] | undefined {
  return tools?.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    returnDirect: tool.returnDirect,
    metadata: tool.metadata,
  }));
}

function toSettings(
  settings: GenerateAiSessionTurnRequestDto["settings"],
): (IChatGenerationSettings & { stream?: boolean }) | undefined {
  if (!settings) {
    return undefined;
  }

  return {
    stream: settings.stream,
    reasoningEffort: settings.reasoningEffort,
    temperature: settings.temperature,
    topP: settings.topP,
    maxTokens: settings.maxTokens,
    stop: settings.stop,
    toolChoice: settings.toolChoice as IChatGenerationSettings["toolChoice"],
    maxToolSteps: settings.maxToolSteps,
    metadata: settings.metadata,
  };
}

function toSseResponse(events: AsyncIterable<unknown>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of events) {
          const payload = event as { type?: string };
          controller.enqueue(
            encoder.encode(
              `event: ${payload.type ?? "message"}\ndata: ${JSON.stringify(event)}\n\n`,
            ),
          );
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}

function mapSessionError(error: unknown): Response | null {
  if (!(error instanceof GenError)) {
    return null;
  }

  switch (error.code) {
    case "AI_SESSION_NOT_FOUND":
      return problem({ status: 404, title: "AI session not found" });
    case "AI_TIMELINE_NOT_FOUND":
      return problem({ status: 404, title: "AI session timeline not found" });
    case "AI_TURN_NOT_FOUND":
      return problem({ status: 404, title: "AI session turn not found" });
    case "AI_MESSAGE_NOT_FOUND":
      return problem({ status: 404, title: "AI session message not found" });
    case "AI_TURN_NOT_IN_TIMELINE":
      return problem({ status: 400, title: error.message, detail: error.message, code: error.code });
    case "AI_STREAM_REQUIRED":
      return problem({ status: 400, title: "Bad Request", detail: error.message, code: error.code });
    default:
      return null;
  }
}

@Authorize()
@Controller("/ai/sessions", {
  tag: "AI Sessions",
  description: "Authenticated AI session endpoints",
})
export class AiSessionController {
  static inject = [
    AiSessionService,
    AiSessionTimelineService,
    AiSessionGraphService,
    AiSessionBranchService,
    AiSessionFeedbackService,
    AiSessionGenerationService,
  ];

  constructor(
    private readonly sessionService: AiSessionService,
    private readonly timelineService: AiSessionTimelineService,
    private readonly graphService: AiSessionGraphService,
    private readonly branchService: AiSessionBranchService,
    private readonly feedbackService: AiSessionFeedbackService,
    private readonly generationService: AiSessionGenerationService,
  ) {}

  @Get("/", {
    summary: "List AI sessions",
    response: AiSessionListResponseDto,
  })
  async list(ctx: RequestContext) {
    return await this.sessionService.list(requireCurrentUser(ctx));
  }

  @Post("/", {
    summary: "Create AI session",
    request: CreateAiSessionRequestDto,
    response: AiSessionResponseDto,
  })
  async create(ctx: RequestContext) {
    const result = await this.sessionService.create({
      currentUser: requireCurrentUser(ctx),
      ...(await ctx.json<CreateAiSessionRequestDto>()),
    });
    return json(result, { status: 201 });
  }

  @Get("/:sessionId", {
    summary: "Get AI session",
    response: AiSessionResponseDto,
    responses: {
      404: {
        description: "Session not found",
        body: defineProblemDetailsType("AI session problem"),
      },
    },
  })
  async getById(ctx: RequestContext) {
    try {
      return await this.sessionService.getById(requireCurrentUser(ctx), ctx.params.sessionId!);
    } catch (error) {
      return mapSessionError(error) ?? problem({ status: 500, title: "Internal Server Error" });
    }
  }

  @Patch("/:sessionId", {
    summary: "Update AI session",
    request: UpdateAiSessionRequestDto,
    response: AiSessionResponseDto,
  })
  async update(ctx: RequestContext) {
    try {
      return await this.sessionService.update({
        currentUser: requireCurrentUser(ctx),
        sessionId: ctx.params.sessionId!,
        ...(await ctx.json<UpdateAiSessionRequestDto>()),
      });
    } catch (error) {
      return mapSessionError(error) ?? problem({ status: 500, title: "Internal Server Error" });
    }
  }

  @Get("/:sessionId/graph", {
    summary: "Get complete AI session graph",
    response: AiSessionGraphDto,
  })
  async getGraph(ctx: RequestContext) {
    try {
      return await this.graphService.getGraph({
        currentUser: requireCurrentUser(ctx),
        sessionId: ctx.params.sessionId!,
      });
    } catch (error) {
      return mapSessionError(error) ?? problem({ status: 500, title: "Internal Server Error" });
    }
  }

  @Get("/:sessionId/timelines/:timelineId/graph", {
    summary: "Get graph for a single timeline",
    response: AiSessionGraphDto,
  })
  async getTimelineGraph(ctx: RequestContext) {
    try {
      return await this.graphService.getGraph({
        currentUser: requireCurrentUser(ctx),
        sessionId: ctx.params.sessionId!,
        timelineId: ctx.params.timelineId!,
      });
    } catch (error) {
      return mapSessionError(error) ?? problem({ status: 500, title: "Internal Server Error" });
    }
  }

  @Get("/:sessionId/timelines", {
    summary: "List timelines for a session",
    response: AiSessionTimelineListResponseDto,
  })
  async listTimelines(ctx: RequestContext) {
    try {
      return await this.timelineService.list(
        requireCurrentUser(ctx),
        ctx.params.sessionId!,
      );
    } catch (error) {
      return mapSessionError(error) ?? problem({ status: 500, title: "Internal Server Error" });
    }
  }

  @Post("/:sessionId/timelines", {
    summary: "Create a timeline",
    request: CreateAiTimelineRequestDto,
    response: AiSessionTimelineResponseDto,
  })
  async createTimeline(ctx: RequestContext) {
    try {
      return json(await this.timelineService.create({
        currentUser: requireCurrentUser(ctx),
        sessionId: ctx.params.sessionId!,
        ...(await ctx.json<CreateAiTimelineRequestDto>()),
      }), { status: 201 });
    } catch (error) {
      return mapSessionError(error) ?? problem({ status: 500, title: "Internal Server Error" });
    }
  }

  @Get("/:sessionId/timelines/:timelineId/turns", {
    summary: "List turns for a timeline",
    response: AiSessionTimelineTurnListResponseDto,
  })
  async listTurns(ctx: RequestContext) {
    try {
      return await this.timelineService.listTurns(
        requireCurrentUser(ctx),
        ctx.params.sessionId!,
        ctx.params.timelineId!,
      );
    } catch (error) {
      return mapSessionError(error) ?? problem({ status: 500, title: "Internal Server Error" });
    }
  }

  @Get("/:sessionId/branches", {
    summary: "List branches for a session",
    response: AiSessionBranchListResponseDto,
  })
  async listBranches(ctx: RequestContext) {
    try {
      return await this.branchService.list(requireCurrentUser(ctx), ctx.params.sessionId!);
    } catch (error) {
      return mapSessionError(error) ?? problem({ status: 500, title: "Internal Server Error" });
    }
  }

  @Post("/:sessionId/branches", {
    summary: "Create a branch",
    request: CreateAiBranchRequestDto,
    response: CreateAiBranchResponseDto,
  })
  async createBranch(ctx: RequestContext) {
    try {
      return json(await this.branchService.create({
        currentUser: requireCurrentUser(ctx),
        sessionId: ctx.params.sessionId!,
        ...(await ctx.json<CreateAiBranchRequestDto>()),
      }), { status: 201 });
    } catch (error) {
      return mapSessionError(error) ?? problem({ status: 500, title: "Internal Server Error" });
    }
  }

  @Post("/:sessionId/messages/:messageId/feedback", {
    summary: "Create or update message feedback",
    request: CreateAiMessageFeedbackRequestDto,
    response: AiSessionMessageFeedbackResponseDto,
  })
  async createFeedback(ctx: RequestContext) {
    try {
      return await this.feedbackService.createOrUpdate({
        currentUser: requireCurrentUser(ctx),
        sessionId: ctx.params.sessionId!,
        messageId: ctx.params.messageId!,
        ...(await ctx.json<CreateAiMessageFeedbackRequestDto>()),
      });
    } catch (error) {
      return mapSessionError(error) ?? problem({ status: 500, title: "Internal Server Error" });
    }
  }

  @Post("/:sessionId/timelines/:timelineId/generate", {
    summary: "Generate a session-bound turn",
    request: GenerateAiSessionTurnRequestDto,
    response: AiSseEventDto,
  })
  async generate(ctx: RequestContext) {
    try {
      const body = await ctx.json<GenerateAiSessionTurnRequestDto>();
      return toSseResponse(this.generationService.generate({
        currentUser: requireCurrentUser(ctx),
        sessionId: ctx.params.sessionId!,
        timelineId: ctx.params.timelineId!,
        content: body.content,
        provider: body.provider,
        model: body.model,
        systemPrompt: body.systemPrompt,
        tools: toTools(body.tools),
        settings: toSettings(body.settings),
        metadata: body.metadata,
      }));
    } catch (error) {
      return mapSessionError(error) ?? problem({ status: 500, title: "Internal Server Error" });
    }
  }

  @Post("/:sessionId/timelines/:timelineId/regenerate-assistant", {
    summary: "Branch and regenerate assistant output",
    request: RegenerateAiAssistantRequestDto,
    response: AiSseEventDto,
    responses: {
      200: {
        description: "SSE stream response",
        body: AiSseEventDto,
      },
    },
  })
  async regenerateAssistant(ctx: RequestContext) {
    try {
      const body = await ctx.json<RegenerateAiAssistantRequestDto>();
      const result = await this.generationService.regenerateAssistant({
        currentUser: requireCurrentUser(ctx),
        sessionId: ctx.params.sessionId!,
        timelineId: ctx.params.timelineId!,
        sourceTurnId: body.sourceTurnId,
        provider: body.provider,
        model: body.model,
        systemPrompt: body.systemPrompt,
        tools: toTools(body.tools),
        settings: toSettings(body.settings),
        metadata: body.metadata,
      });

      return toSseResponse((async function* () {
        yield { type: "started", timeline: result.timeline, branch: result.branch };
        for await (const event of result.stream) {
          yield event;
        }
      })());
    } catch (error) {
      return mapSessionError(error) ?? problem({ status: 500, title: "Internal Server Error" });
    }
  }

  @Post("/:sessionId/timelines/:timelineId/edit-user-and-regenerate", {
    summary: "Branch from a user edit and regenerate",
    request: EditAiUserAndRegenerateRequestDto,
    response: AiSseEventDto,
  })
  async editUserAndRegenerate(ctx: RequestContext) {
    try {
      const body = await ctx.json<EditAiUserAndRegenerateRequestDto>();
      const result = await this.generationService.editUserAndRegenerate({
        currentUser: requireCurrentUser(ctx),
        sessionId: ctx.params.sessionId!,
        timelineId: ctx.params.timelineId!,
        sourceTurnId: body.sourceTurnId,
        content: body.content,
        provider: body.provider,
        model: body.model,
        systemPrompt: body.systemPrompt,
        tools: toTools(body.tools),
        settings: toSettings(body.settings),
        metadata: body.metadata,
      });

      return toSseResponse((async function* () {
        yield { type: "started", timeline: result.timeline, branch: result.branch };
        for await (const event of result.stream) {
          yield event;
        }
      })());
    } catch (error) {
      return mapSessionError(error) ?? problem({ status: 500, title: "Internal Server Error" });
    }
  }
}
