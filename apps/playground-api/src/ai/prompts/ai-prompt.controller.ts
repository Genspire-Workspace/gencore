import { Authorize, Controller, Delete, Get, Patch, Post, defineProblemDetailsType, json, problem } from "@genspire/server";
import type { RequestContext } from "@genspire/server";
import { getCurrentUser, requireCurrentUser } from "@genspire/auth";
import { AiPromptService } from "./ai-prompt.service.js";
import {
  AiPromptListResponseDto,
  AiPromptResponseDto,
  CreateAiPromptRequestDto,
  RenderAiPromptRequestDto,
  RenderAiPromptResponseDto,
  UpdateAiPromptRequestDto,
} from "./ai-prompt.dto.js";

@Authorize()
@Controller("/ai/prompts", {
  tag: "AI Prompts",
  description: "CRUD and rendering endpoints for persisted AI prompts",
})
export class AiPromptController {
  static inject = [AiPromptService];

  constructor(private readonly service: AiPromptService) {}

  @Get("/", {
    summary: "List accessible AI prompts",
    response: AiPromptListResponseDto,
  })
  async list(ctx: RequestContext) {
    const currentUser = getCurrentUser(ctx);
    const owner = ctx.query.get("owner") ?? undefined;
    const visibility = ctx.query.get("visibility") ?? undefined;
    const name = ctx.query.get("name") ?? undefined;

    return await this.service.listAccessible(currentUser, {
      name,
      visibility: visibility as "private" | "shared" | "system" | undefined,
      ownerUserId: owner === "me" ? currentUser?.id : owner,
    });
  }

  @Post("/", {
    summary: "Create an AI prompt",
    request: CreateAiPromptRequestDto,
    response: AiPromptResponseDto,
    responses: {
      400: {
        description: "Validation error",
        body: defineProblemDetailsType("Validation error problem response"),
      },
    },
  })
  async create(ctx: RequestContext) {
    const currentUser = requireCurrentUser(ctx);

    return json(
      await this.service.create(currentUser, await ctx.json<CreateAiPromptRequestDto>()),
      { status: 201 },
    );
  }

  @Get("/:id", {
    summary: "Get an AI prompt by id",
    response: AiPromptResponseDto,
  })
  async getById(ctx: RequestContext) {
    const id = ctx.params.id;

    if (!id) {
      return problem({ status: 400, title: "Prompt id is required" });
    }

    const prompt = await this.service.getAccessibleById(getCurrentUser(ctx), id);

    if (!prompt) {
      return problem({ status: 404, title: "Prompt not found" });
    }

    return prompt;
  }

  @Patch("/:id", {
    summary: "Update an AI prompt",
    request: UpdateAiPromptRequestDto,
    response: AiPromptResponseDto,
  })
  async updateById(ctx: RequestContext) {
    const id = ctx.params.id;

    if (!id) {
      return problem({ status: 400, title: "Prompt id is required" });
    }

    const currentUser = requireCurrentUser(ctx);
    const updated = await this.service.updateById(
      currentUser,
      id,
      await ctx.json<UpdateAiPromptRequestDto>(),
    );

    if (!updated) {
      return problem({ status: 404, title: "Prompt not found" });
    }

    return updated;
  }

  @Delete("/:id", {
    summary: "Delete an AI prompt",
    response: defineProblemDetailsType("Delete AI prompt response"),
  })
  async deleteById(ctx: RequestContext) {
    const id = ctx.params.id;

    if (!id) {
      return problem({ status: 400, title: "Prompt id is required" });
    }

    const deleted = await this.service.deleteById(requireCurrentUser(ctx), id);

    if (!deleted) {
      return problem({ status: 404, title: "Prompt not found" });
    }

    return { deleted: true };
  }

  @Post("/:id/render", {
    summary: "Render an AI prompt for inspection",
    request: RenderAiPromptRequestDto,
    response: RenderAiPromptResponseDto,
  })
  async renderById(ctx: RequestContext) {
    const id = ctx.params.id;

    if (!id) {
      return problem({ status: 400, title: "Prompt id is required" });
    }

    const rendered = await this.service.renderById(
      getCurrentUser(ctx),
      id,
      await ctx.json<RenderAiPromptRequestDto>(),
    );

    if (!rendered) {
      return problem({ status: 404, title: "Prompt not found" });
    }

    return rendered;
  }
}
