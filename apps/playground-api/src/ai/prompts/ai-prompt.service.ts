import { GenError, Scoped } from "@genspire/core";
import type { ICurrentUser } from "@genspire/auth";
import { HttpError } from "@genspire/server";
import { defineAiPrompt } from "@genspire/ai/domain";
import type { AiPromptTemplate, IAiPrompt, IAiPromptVariable } from "@genspire/ai/domain";
import { AiPromptRenderer } from "@genspire/ai/application";
import { PlaygroundDbContext } from "../../database/playground-db-context.js";
import { AiPromptEntity, type AiPromptVisibility } from "./ai-prompt.entity.js";
import type {
  AiPromptListResponseDto,
  AiPromptResponseDto,
  CreateAiPromptRequestDto,
  RenderAiPromptRequestDto,
  RenderAiPromptResponseDto,
  UpdateAiPromptRequestDto,
} from "./ai-prompt.dto.js";

interface IAiPromptListFilters {
  name?: string;
  ownerUserId?: string;
  visibility?: AiPromptVisibility;
}

function isAdmin(currentUser: ICurrentUser | null | undefined): boolean {
  return currentUser?.roles.includes("admin") === true;
}

function canAccessPrompt(
  entity: AiPromptEntity,
  currentUser: ICurrentUser | null,
): boolean {
  if (entity.visibility === "system") {
    return true;
  }

  if (entity.visibility === "shared") {
    return currentUser !== null;
  }

  return currentUser?.id === entity.userId;
}

function canMutatePrompt(
  entity: AiPromptEntity,
  currentUser: ICurrentUser,
): boolean {
  if (isAdmin(currentUser)) {
    return true;
  }

  if (entity.visibility === "system") {
    return false;
  }

  return entity.userId === currentUser.id;
}

function toPromptResponse(entity: AiPromptEntity): AiPromptResponseDto {
  return {
    id: entity.id,
    userId: entity.userId,
    visibility: entity.visibility,
    name: entity.name,
    description: entity.description,
    argumentHint: entity.argumentHint,
    version: entity.version,
    template: entity.template,
    variables: entity.variables as AiPromptResponseDto["variables"],
    metadata: entity.metadata,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

function toRuntimePrompt(entity: AiPromptEntity): IAiPrompt {
  return defineAiPrompt({
    id: entity.id,
    name: entity.name,
    description: entity.description ?? undefined,
    argumentHint: entity.argumentHint ?? undefined,
    version: entity.version ?? undefined,
    template: entity.template,
    variables: entity.variables as IAiPromptVariable[] | undefined,
    metadata: entity.metadata ?? undefined,
  });
}

function normalizeVisibility(
  visibility: string | undefined,
): AiPromptVisibility {
  if (visibility === "shared" || visibility === "system") {
    return visibility;
  }

  return "private";
}

function hasPromptTemplateValue(template: unknown): template is AiPromptTemplate {
  if (typeof template === "string") {
    return template.trim().length > 0;
  }

  return Array.isArray(template) && template.length > 0;
}

@Scoped()
export class AiPromptService {
  static inject = [PlaygroundDbContext];

  private readonly renderer = new AiPromptRenderer();

  constructor(private readonly db: PlaygroundDbContext) {}

  async listAccessible(
    currentUser: ICurrentUser | null,
    filters: IAiPromptListFilters = {},
  ): Promise<AiPromptListResponseDto> {
    const prompts = await this.db.aiPrompts.list({
      orderBy: "updatedAt",
      direction: "desc",
    });
    const normalizedName = filters.name?.trim().toLowerCase();

    return {
      items: prompts
        .filter((entity) => canAccessPrompt(entity, currentUser))
        .filter((entity) => !filters.visibility || entity.visibility === filters.visibility)
        .filter((entity) => !filters.ownerUserId || entity.userId === filters.ownerUserId)
        .filter((entity) =>
          !normalizedName ||
          entity.name.toLowerCase().includes(normalizedName) ||
          entity.description?.toLowerCase().includes(normalizedName),
        )
        .map(toPromptResponse),
    };
  }

  async create(
    currentUser: ICurrentUser,
    input: CreateAiPromptRequestDto,
  ): Promise<AiPromptResponseDto> {
    if (!hasPromptTemplateValue(input.template)) {
      throw new GenError("Prompt template is required.", "AI_PROMPT_VALIDATION_ERROR");
    }

    const visibility = normalizeVisibility(input.visibility);

    if (visibility === "system" && !isAdmin(currentUser)) {
      throw new HttpError(403, "Only admins can create system prompts.");
    }

    const entity = new AiPromptEntity();
    entity.id = crypto.randomUUID();
    entity.userId = visibility === "system" ? null : currentUser.id;
    entity.visibility = visibility;
    entity.name = input.name;
    entity.description = input.description ?? null;
    entity.argumentHint = input.argumentHint ?? null;
    entity.version = input.version ?? null;
    entity.template = input.template as AiPromptTemplate;
    entity.variables = input.variables ?? null;
    entity.metadata = input.metadata ?? null;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();

    toRuntimePrompt(entity);

    await this.db.aiPrompts.add(entity);
    await this.db.saveChanges();

    return toPromptResponse(entity);
  }

  async getAccessibleById(
    currentUser: ICurrentUser | null,
    id: string,
  ): Promise<AiPromptResponseDto | null> {
    const entity = await this.db.aiPrompts.findById(id);

    if (!entity || !canAccessPrompt(entity, currentUser)) {
      return null;
    }

    return toPromptResponse(entity);
  }

  async updateById(
    currentUser: ICurrentUser,
    id: string,
    input: UpdateAiPromptRequestDto,
  ): Promise<AiPromptResponseDto | null> {
    const entity = await this.db.aiPrompts.findById(id);

    if (!entity || !canAccessPrompt(entity, currentUser)) {
      return null;
    }

    if (!canMutatePrompt(entity, currentUser)) {
      throw new HttpError(403, "You do not have permission to update this prompt.");
    }

    if (input.visibility !== undefined) {
      const visibility = normalizeVisibility(input.visibility);

      if (visibility === "system" && !isAdmin(currentUser)) {
        throw new HttpError(403, "Only admins can move prompts to system visibility.");
      }

      entity.visibility = visibility;
      entity.userId = visibility === "system" ? null : entity.userId ?? currentUser.id;
    }

    if (input.name !== undefined) {
      entity.name = input.name;
    }

    if (input.description !== undefined) {
      entity.description = input.description ?? null;
    }

    if (input.argumentHint !== undefined) {
      entity.argumentHint = input.argumentHint ?? null;
    }

    if (input.version !== undefined) {
      entity.version = input.version ?? null;
    }

    if (input.template !== undefined) {
      entity.template = input.template as AiPromptTemplate;
    }

    if (input.variables !== undefined) {
      entity.variables = input.variables ?? null;
    }

    if (input.metadata !== undefined) {
      entity.metadata = input.metadata ?? null;
    }

    toRuntimePrompt(entity);

    await this.db.aiPrompts.update(entity);
    await this.db.saveChanges();

    return toPromptResponse(entity);
  }

  async deleteById(
    currentUser: ICurrentUser,
    id: string,
  ): Promise<boolean> {
    const entity = await this.db.aiPrompts.findById(id);

    if (!entity || !canAccessPrompt(entity, currentUser)) {
      return false;
    }

    if (!canMutatePrompt(entity, currentUser)) {
      throw new HttpError(403, "You do not have permission to delete this prompt.");
    }

    await this.db.aiPrompts.remove(entity);
    await this.db.saveChanges();

    return true;
  }

  async renderById(
    currentUser: ICurrentUser | null,
    id: string,
    input: RenderAiPromptRequestDto,
  ): Promise<RenderAiPromptResponseDto | null> {
    const entity = await this.db.aiPrompts.findById(id);

    if (!entity || !canAccessPrompt(entity, currentUser)) {
      return null;
    }

    const rendered = this.renderer.render(toRuntimePrompt(entity), {
      variables: input.variables,
      metadata: input.metadata,
    });

    return {
      messages: rendered.messages.map((message) => ({
        role: message.role,
        content: message.content,
        ...(message.name ? { name: message.name } : {}),
        ...(message.metadata ? { metadata: message.metadata } : {}),
      })),
      metadata: rendered.metadata,
    };
  }

  async resolvePromptsByIds(
    currentUser: ICurrentUser | null,
    promptIds: readonly string[],
  ): Promise<IAiPrompt[]> {
    const prompts: IAiPrompt[] = [];

    for (const promptId of promptIds) {
      const entity = await this.db.aiPrompts.findById(promptId);

      if (!entity || !canAccessPrompt(entity, currentUser)) {
        throw new HttpError(404, `AI prompt '${promptId}' was not found.`);
      }

      prompts.push(toRuntimePrompt(entity));
    }

    return prompts;
  }
}
