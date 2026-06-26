import { Authorize, Controller, Delete, Get, Patch, Post, defineProblemDetailsType, json, problem } from "@genspire/server";
import type { RequestContext } from "@genspire/server";
import { getCurrentUser, requireCurrentUser } from "@genspire/auth";
import { AiSkillService } from "./ai-skill.service.js";
import {
  AiSkillDownloadResponseDto,
  AiSkillListResponseDto,
  AiSkillRegistrationResponseDto,
  AiSkillResponseDto,
  CreateAiSkillRequestDto,
  UpdateAiSkillRequestDto,
} from "./ai-skill.dto.js";

@Authorize()
@Controller("/ai/skills", {
  tag: "AI Skills",
  description: "Managed AI skill endpoints with server/client execution separation",
})
export class AiSkillController {
  static inject = [AiSkillService];

  constructor(private readonly service: AiSkillService) {}

  @Get("/", {
    summary: "List accessible AI skills",
    response: AiSkillListResponseDto,
  })
  async list(ctx: RequestContext) {
    const currentUser = getCurrentUser(ctx);
    const owner = ctx.query.get("owner") ?? undefined;
    const visibility = ctx.query.get("visibility") ?? undefined;
    const executionMode = ctx.query.get("executionMode") ?? undefined;
    const name = ctx.query.get("name") ?? undefined;

    return await this.service.listAccessible(currentUser, {
      name,
      visibility: visibility as "private" | "shared" | "system" | undefined,
      executionMode: executionMode as "server" | "client" | undefined,
      ownerUserId: owner === "me" ? currentUser?.id : owner,
    });
  }

  @Post("/", {
    summary: "Create a managed AI skill",
    request: CreateAiSkillRequestDto,
    response: AiSkillResponseDto,
  })
  async create(ctx: RequestContext) {
    const currentUser = requireCurrentUser(ctx);

    return json(
      await this.service.create(currentUser, await ctx.json<CreateAiSkillRequestDto>()),
      { status: 201 },
    );
  }

  @Post("/import", {
    summary: "Import a zip-backed client skill bundle",
    responses: {
      201: {
        description: "Imported AI skill",
        body: AiSkillResponseDto,
      },
      400: {
        description: "Invalid skill archive",
        body: defineProblemDetailsType("Invalid skill archive problem response"),
      },
    },
  })
  async importBundle(ctx: RequestContext) {
    const currentUser = requireCurrentUser(ctx);
    const formData = await ctx.req.formData();
    const fileField = formData.get("file");

    if (!fileField || !(fileField instanceof Blob)) {
      return problem({
        status: 400,
        title: "Skill bundle file is required",
      });
    }

    const originalName = fileField instanceof File && fileField.name
      ? fileField.name
      : "skill.zip";
    const visibilityField = formData.get("visibility");
    const descriptionField = formData.get("description");

    return json(
      await this.service.importZipBundle(currentUser, {
        file: fileField,
        originalName,
        visibility: typeof visibilityField === "string" ? visibilityField : undefined,
        description: typeof descriptionField === "string" ? descriptionField : undefined,
      }),
      { status: 201 },
    );
  }

  @Get("/:id", {
    summary: "Get an AI skill by id",
    response: AiSkillResponseDto,
  })
  async getById(ctx: RequestContext) {
    const id = ctx.params.id;

    if (!id) {
      return problem({ status: 400, title: "Skill id is required" });
    }

    const skill = await this.service.getAccessibleById(getCurrentUser(ctx), id);

    if (!skill) {
      return problem({ status: 404, title: "Skill not found" });
    }

    return skill;
  }

  @Patch("/:id", {
    summary: "Update an AI skill",
    request: UpdateAiSkillRequestDto,
    response: AiSkillResponseDto,
  })
  async updateById(ctx: RequestContext) {
    const id = ctx.params.id;

    if (!id) {
      return problem({ status: 400, title: "Skill id is required" });
    }

    const updated = await this.service.updateById(
      requireCurrentUser(ctx),
      id,
      await ctx.json<UpdateAiSkillRequestDto>(),
    );

    if (!updated) {
      return problem({ status: 404, title: "Skill not found" });
    }

    return updated;
  }

  @Delete("/:id", {
    summary: "Delete an AI skill",
  })
  async deleteById(ctx: RequestContext) {
    const id = ctx.params.id;

    if (!id) {
      return problem({ status: 400, title: "Skill id is required" });
    }

    const deleted = await this.service.deleteById(requireCurrentUser(ctx), id);

    if (!deleted) {
      return problem({ status: 404, title: "Skill not found" });
    }

    return { deleted: true };
  }

  @Get("/:id/download", {
    summary: "Get bundle download information for a client skill",
    response: AiSkillDownloadResponseDto,
  })
  async downloadInfo(ctx: RequestContext) {
    const id = ctx.params.id;

    if (!id) {
      return problem({ status: 400, title: "Skill id is required" });
    }

    const downloadInfo = await this.service.getDownloadInfo(getCurrentUser(ctx), id);

    if (!downloadInfo) {
      return problem({ status: 404, title: "Skill bundle not found" });
    }

    return downloadInfo;
  }

  @Post("/:id/register", {
    summary: "Register an AI skill for runtime usage",
    response: AiSkillRegistrationResponseDto,
  })
  async registerById(ctx: RequestContext) {
    const id = ctx.params.id;

    if (!id) {
      return problem({ status: 400, title: "Skill id is required" });
    }

    const result = await this.service.setRegisteredById(
      requireCurrentUser(ctx),
      id,
      true,
    );

    if (!result) {
      return problem({ status: 404, title: "Skill not found" });
    }

    return result;
  }

  @Post("/:id/unregister", {
    summary: "Unregister an AI skill from runtime usage",
    response: AiSkillRegistrationResponseDto,
  })
  async unregisterById(ctx: RequestContext) {
    const id = ctx.params.id;

    if (!id) {
      return problem({ status: 400, title: "Skill id is required" });
    }

    const result = await this.service.setRegisteredById(
      requireCurrentUser(ctx),
      id,
      false,
    );

    if (!result) {
      return problem({ status: 404, title: "Skill not found" });
    }

    return result;
  }
}
