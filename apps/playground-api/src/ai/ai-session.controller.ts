// file: apps\playground-api\src\ai\ai-session.controller.ts

import {
  Authorize,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  defineProblemDetailsType,
  json,
  problem,
} from "@genspire/server";
import type { RequestContext } from "@genspire/server";
import { requireCurrentUser } from "@genspire/auth";
import { AiSessionService } from "./ai-session.service.js";
import {
  AiSessionListResponseDto,
  AiSessionMessageListResponseDto,
  AiSessionResponseDto,
  CreateAiSessionRequestDto,
  DeleteAiSessionResponseDto,
  GenerateAiSessionMessageRequestDto,
  GenerateAiSessionMessageResponseDto,
  GenerateAiSessionMessageStreamChunkDto,
  UpdateAiSessionRequestDto,
} from "./ai-session.dto.js";

@Authorize()
@Controller("/ai/sessions", {
  tag: "AI Sessions",
  description: "Session-based AI conversation endpoints backed by libSQL",
})
export class AiSessionController {
  static inject = [AiSessionService];

  constructor(private readonly service: AiSessionService) {}

  @Get("/", {
    summary: "List AI sessions for the current user",
    response: AiSessionListResponseDto,
  })
  async list(ctx: RequestContext) {
    const user = requireCurrentUser(ctx);
    return await this.service.listForUser(user.id);
  }

  @Post("/", {
    summary: "Create an AI session",
    request: CreateAiSessionRequestDto,
    response: AiSessionResponseDto,
    responses: {
      500: {
        description: "Internal server error",
        body: defineProblemDetailsType("Internal server error problem response"),
      },
    },
  })
  async create(ctx: RequestContext) {
    const user = requireCurrentUser(ctx);
    return json(
      await this.service.create(user.id, await ctx.json<CreateAiSessionRequestDto>()),
      { status: 201 },
    );
  }

  @Get("/:id", {
    summary: "Get an AI session by id",
    response: AiSessionResponseDto,
    responses: {
      400: {
        description: "Missing session id",
        body: defineProblemDetailsType("Missing session id problem response"),
      },
      404: {
        description: "Session not found",
        body: defineProblemDetailsType("Session not found problem response"),
      },
    },
  })
  async getById(ctx: RequestContext) {
    const id = ctx.params.id;
    if (!id) {
      return problem({ status: 400, title: "Session id is required" });
    }
    const user = requireCurrentUser(ctx);
    const session = await this.service.getById(user.id, id);
    if (!session) {
      return problem({ status: 404, title: "Session not found" });
    }
    return session;
  }

  @Patch("/:id", {
    summary: "Update an AI session",
    request: UpdateAiSessionRequestDto,
    response: AiSessionResponseDto,
    responses: {
      400: {
        description: "Validation error",
        body: defineProblemDetailsType("Validation error problem response"),
      },
      404: {
        description: "Session not found",
        body: defineProblemDetailsType("Session not found problem response"),
      },
    },
  })
  async updateById(ctx: RequestContext) {
    const id = ctx.params.id;
    if (!id) {
      return problem({ status: 400, title: "Session id is required" });
    }
    const user = requireCurrentUser(ctx);
    const session = await this.service.updateById(
      user.id,
      id,
      await ctx.json<UpdateAiSessionRequestDto>(),
    );
    if (!session) {
      return problem({ status: 404, title: "Session not found" });
    }
    return session;
  }

  @Delete("/:id", {
    summary: "Delete an AI session and its messages",
    response: DeleteAiSessionResponseDto,
    responses: {
      400: {
        description: "Missing session id",
        body: defineProblemDetailsType("Missing session id problem response"),
      },
      404: {
        description: "Session not found",
        body: defineProblemDetailsType("Session not found problem response"),
      },
    },
  })
  async deleteById(ctx: RequestContext) {
    const id = ctx.params.id;
    if (!id) {
      return problem({ status: 400, title: "Session id is required" });
    }
    const user = requireCurrentUser(ctx);
    const result = await this.service.deleteById(user.id, id);
    if (!result.deleted) {
      return problem({ status: 404, title: "Session not found" });
    }
    return result;
  }

  @Get("/:id/messages", {
    summary: "List messages for an AI session",
    response: AiSessionMessageListResponseDto,
    responses: {
      400: {
        description: "Missing session id",
        body: defineProblemDetailsType("Missing session id problem response"),
      },
      404: {
        description: "Session not found",
        body: defineProblemDetailsType("Session not found problem response"),
      },
    },
  })
  async listMessages(ctx: RequestContext) {
    const id = ctx.params.id;
    if (!id) {
      return problem({ status: 400, title: "Session id is required" });
    }
    const user = requireCurrentUser(ctx);
    const messages = await this.service.listMessages(user.id, id);
    if (!messages) {
      return problem({ status: 404, title: "Session not found" });
    }
    return messages;
  }

  @Post("/:id/messages", {
    summary: "Generate a new assistant turn for an AI session",
    request: GenerateAiSessionMessageRequestDto,
    response: GenerateAiSessionMessageResponseDto,
    responses: {
      400: {
        description: "Validation error",
        body: defineProblemDetailsType("Validation error problem response"),
      },
      404: {
        description: "Session not found",
        body: defineProblemDetailsType("Session not found problem response"),
      },
      500: {
        description: "Internal server error",
        body: defineProblemDetailsType("Internal server error problem response"),
      },
    },
  })
  async generateMessage(ctx: RequestContext) {
    const id = ctx.params.id;
    if (!id) {
      return problem({ status: 400, title: "Session id is required" });
    }
    const user = requireCurrentUser(ctx);
    const result = await this.service.generateMessage(
      user.id,
      id,
      await ctx.json<GenerateAiSessionMessageRequestDto>(),
    );
    if (!result) {
      return problem({ status: 404, title: "Session not found" });
    }
    return result;
  }

  @Post("/:id/messages/stream", {
    summary: "Stream a new assistant turn for an AI session",
    request: GenerateAiSessionMessageRequestDto,
    response: GenerateAiSessionMessageStreamChunkDto,
    responses: {
      404: {
        description: "Session not found",
        body: defineProblemDetailsType("Session not found problem response"),
      },
    },
  })
  async streamMessage(ctx: RequestContext) {
    const id = ctx.params.id;
    if (!id) {
      return problem({ status: 400, title: "Session id is required" });
    }
    const user = requireCurrentUser(ctx);
    const response = await this.service.streamMessage(
      user.id,
      id,
      await ctx.json<GenerateAiSessionMessageRequestDto>(),
    );
    if (!response) {
      return problem({ status: 404, title: "Session not found" });
    }
    return response;
  }
}