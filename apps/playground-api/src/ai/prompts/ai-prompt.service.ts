import { createGuid, GenError, Scoped } from "@genspire/core";
import type { ICurrentUser } from "@genspire/auth";
import { HttpError } from "@genspire/server";
import { defineAiPrompt } from "@genspire/ai/domain";
import type { AiPromptTemplate, AiPromptType, IAiPrompt, IAiPromptVariable } from "@genspire/ai/domain";
import { AiPromptRenderer } from "@genspire/ai/application";
import { PlaygroundDbContext } from "../../database/playground-db-context.js";
import { AiPromptEntity, type AiPromptVisibility } from "./ai-prompt.entity.js";
import { AiPromptTypeDefaultEntity } from "./ai-prompt-type-default.entity.js";
import { AiPromptTypeEntity } from "./ai-prompt-type.entity.js";
import type {
  AiPromptListResponseDto,
  AiPromptResponseDto,
  AiPromptTypeListResponseDto,
  AiPromptTypeResponseDto,
  CreateAiPromptRequestDto,
  RenderAiPromptRequestDto,
  RenderAiPromptResponseDto,
  UpdateAiPromptRequestDto,
} from "./ai-prompt.dto.js";

interface IAiPromptListFilters {
  name?: string;
  ownerUserId?: string;
  visibility?: AiPromptVisibility;
  type?: AiPromptType;
}

const BUILTIN_PROMPT_TYPES = [
  {
    id: "system_prompt",
    name: "System Prompt",
    description: "Prompts used as system-level instructions for chat generation.",
  },
  {
    id: "user_prompt",
    name: "User Prompt",
    description: "General prompts intended for user-authored or user-facing prompt flows.",
  },
  {
    id: "chat_title_generation",
    name: "Chat Title Generation",
    description: "Prompts used to generate chat session titles.",
  },
  {
    id: "chat_summarization",
    name: "Chat Summarization",
    description: "Prompts used to summarize chat sessions or conversation branches.",
  },
  {
    id: "chat_memory_extraction",
    name: "Chat Memory Extraction",
    description: "Prompts used to extract durable memory from chat conversations.",
  },
] as const;

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

function createPromptResponse(
  entity: AiPromptEntity,
  defaultPromptIdsByType: ReadonlyMap<string, string>,
): AiPromptResponseDto {
  const promptType = readStoredPromptType(entity);
  return {
    id: entity.id,
    userId: entity.userId,
    visibility: entity.visibility,
    type: promptType,
    isDefault: defaultPromptIdsByType.get(promptType) === entity.id,
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

function createRuntimePrompt(
  entity: AiPromptEntity,
  defaultPromptIdsByType: ReadonlyMap<string, string>,
): IAiPrompt {
  const promptType = readStoredPromptType(entity);
  return defineAiPrompt({
    id: entity.id,
    type: promptType,
    isDefault: defaultPromptIdsByType.get(promptType) === entity.id,
    name: entity.name,
    description: entity.description ?? undefined,
    argumentHint: entity.argumentHint ?? undefined,
    version: entity.version ?? undefined,
    template: entity.template,
    variables: entity.variables as IAiPromptVariable[] | undefined,
    metadata: entity.metadata ?? undefined,
  });
}

function toPromptTypeResponse(entity: AiPromptTypeEntity): AiPromptTypeResponseDto {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    isSystem: entity.isSystem,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
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

function normalizePromptType(type: string | undefined): AiPromptType {
  if (type === undefined || type === null || type.trim().length === 0) {
    return "user_prompt";
  }
  return type.trim();
}

function readStoredPromptType(entity: Pick<AiPromptEntity, "type">): AiPromptType {
  return normalizePromptType(entity.type ?? undefined);
}

@Scoped()
export class AiPromptService {
  static inject = [PlaygroundDbContext];

  private readonly renderer = new AiPromptRenderer();

  constructor(private readonly db: PlaygroundDbContext) {}

  async listPromptTypes(): Promise<AiPromptTypeListResponseDto> {
    await this.ensureBuiltInPromptTypes();
    const promptTypes = await this.db.aiPromptTypes.list({
      orderBy: "name",
      direction: "asc",
    });

    return {
      items: promptTypes.map(toPromptTypeResponse),
    };
  }

  async listAccessible(
    currentUser: ICurrentUser | null,
    filters: IAiPromptListFilters = {},
  ): Promise<AiPromptListResponseDto> {
    const prompts = await this.db.aiPrompts.list({
      orderBy: "updatedAt",
      direction: "desc",
    });
    const defaultPromptIdsByType = await this.readDefaultPromptIdsByType();
    const normalizedName = filters.name?.trim().toLowerCase();

    return {
      items: prompts
        .filter((entity) => canAccessPrompt(entity, currentUser))
        .filter((entity) => !filters.visibility || entity.visibility === filters.visibility)
        .filter((entity) => !filters.type || readStoredPromptType(entity) === filters.type)
        .filter((entity) => !filters.ownerUserId || entity.userId === filters.ownerUserId)
        .filter((entity) =>
          !normalizedName ||
          entity.name.toLowerCase().includes(normalizedName) ||
          entity.description?.toLowerCase().includes(normalizedName),
        )
        .map((entity) => createPromptResponse(entity, defaultPromptIdsByType)),
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
    const type = await this.requirePromptType(normalizePromptType(input.type));

    if (visibility === "system" && !isAdmin(currentUser)) {
      throw new HttpError(403, "Only admins can create system prompts.");
    }

    const entity = new AiPromptEntity();
    entity.id = createGuid();
    entity.userId = visibility === "system" ? null : currentUser.id;
    entity.visibility = visibility;
    entity.type = type;
    entity.name = input.name;
    entity.description = input.description ?? null;
    entity.argumentHint = input.argumentHint ?? null;
    entity.version = input.version ?? null;
    entity.template = input.template as AiPromptTemplate;
    entity.variables = input.variables ?? null;
    entity.metadata = input.metadata ?? null;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();

    createRuntimePrompt(entity, new Map([[readStoredPromptType(entity), entity.id]]));

    await this.db.aiPrompts.add(entity);
    await this.syncDefaultPromptAssignment({
      promptId: entity.id,
      previousType: null,
      nextType: readStoredPromptType(entity),
      shouldBeDefault: input.isDefault === true,
    });
    await this.db.saveChanges();

    const defaultPromptIdsByType = await this.readDefaultPromptIdsByType();
    return createPromptResponse(entity, defaultPromptIdsByType);
  }

  async getAccessibleById(
    currentUser: ICurrentUser | null,
    id: string,
  ): Promise<AiPromptResponseDto | null> {
    const entity = await this.db.aiPrompts.findById(id);

    if (!entity || !canAccessPrompt(entity, currentUser)) {
      return null;
    }

    const defaultPromptIdsByType = await this.readDefaultPromptIdsByType();
    return createPromptResponse(entity, defaultPromptIdsByType);
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

    const defaultPromptIdsByType = await this.readDefaultPromptIdsByType();
    const currentType = readStoredPromptType(entity);
    const currentIsDefault = defaultPromptIdsByType.get(currentType) === entity.id;
    const previousType = currentType;

    if (input.visibility !== undefined) {
      const visibility = normalizeVisibility(input.visibility);

      if (visibility === "system" && !isAdmin(currentUser)) {
        throw new HttpError(403, "Only admins can move prompts to system visibility.");
      }

      entity.visibility = visibility;
      entity.userId = visibility === "system" ? null : entity.userId ?? currentUser.id;
    }

    if (input.type !== undefined) {
      entity.type = await this.requirePromptType(normalizePromptType(input.type));
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

    createRuntimePrompt(entity, new Map([[readStoredPromptType(entity), entity.id]]));

    await this.db.aiPrompts.update(entity);
    await this.syncDefaultPromptAssignment({
      promptId: entity.id,
      previousType,
      nextType: readStoredPromptType(entity),
      shouldBeDefault: input.isDefault ?? currentIsDefault,
      wasDefault: currentIsDefault,
    });
    await this.db.saveChanges();

    const nextDefaultPromptIdsByType = await this.readDefaultPromptIdsByType();
    return createPromptResponse(entity, nextDefaultPromptIdsByType);
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

    const defaultAssignment = await this.db.aiPromptTypeDefaults.findById(readStoredPromptType(entity));
    if (defaultAssignment?.promptId === entity.id) {
      await this.db.aiPromptTypeDefaults.remove(defaultAssignment);
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

    const defaultPromptIdsByType = await this.readDefaultPromptIdsByType();
    const rendered = this.renderer.render(createRuntimePrompt(entity, defaultPromptIdsByType), {
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
    const defaultPromptIdsByType = await this.readDefaultPromptIdsByType();

    for (const promptId of promptIds) {
      const entity = await this.db.aiPrompts.findById(promptId);

      if (!entity || !canAccessPrompt(entity, currentUser)) {
        throw new HttpError(404, `AI prompt '${promptId}' was not found.`);
      }

      prompts.push(createRuntimePrompt(entity, defaultPromptIdsByType));
    }

    return prompts;
  }

  async resolvePrompt(
    currentUser: ICurrentUser | null,
    reference: { id?: string; name?: string; type?: string },
  ): Promise<IAiPrompt | null> {
    const promptId = reference.id?.trim();
    if (promptId) {
      const entity = await this.db.aiPrompts.findById(promptId);
      const defaultPromptIdsByType = await this.readDefaultPromptIdsByType();
      return entity && canAccessPrompt(entity, currentUser)
        ? createRuntimePrompt(entity, defaultPromptIdsByType)
        : null;
    }

    const promptName = reference.name?.trim().toLowerCase();
    if (!promptName) {
      const promptType = reference.type?.trim();
      if (!promptType) {
        return null;
      }

      const defaultAssignment = await this.db.aiPromptTypeDefaults.findById(promptType);
      if (!defaultAssignment) {
        return null;
      }
      const defaultEntity = await this.db.aiPrompts.findById(defaultAssignment.promptId);

      return defaultEntity && canAccessPrompt(defaultEntity, currentUser)
        ? createRuntimePrompt(defaultEntity, new Map([[promptType, defaultEntity.id]]))
        : null;
    }

    const prompts = await this.db.aiPrompts.list({
      orderBy: "updatedAt",
      direction: "desc",
    });
    const defaultPromptIdsByType = await this.readDefaultPromptIdsByType();
    const entity = prompts.find((item) =>
      canAccessPrompt(item, currentUser)
      && item.name.trim().toLowerCase() === promptName,
    );

    return entity ? createRuntimePrompt(entity, defaultPromptIdsByType) : null;
  }

  private async requirePromptType(typeId: string): Promise<AiPromptType> {
    await this.ensureBuiltInPromptTypes();
    const promptType = await this.db.aiPromptTypes.findById(typeId);
    if (!promptType) {
      throw new GenError(`Unsupported prompt type '${typeId}'.`, "AI_PROMPT_VALIDATION_ERROR");
    }

    return promptType.id;
  }

  private async ensureBuiltInPromptTypes(): Promise<void> {
    let changed = false;

    for (const definition of BUILTIN_PROMPT_TYPES) {
      const existing = await this.db.aiPromptTypes.findById(definition.id);
      if (existing) {
        if (
          existing.name !== definition.name
          || existing.description !== definition.description
          || existing.isSystem !== true
        ) {
          existing.name = definition.name;
          existing.description = definition.description;
          existing.isSystem = true;
          existing.updatedAt = new Date();
          await this.db.aiPromptTypes.update(existing);
          changed = true;
        }
        continue;
      }

      const promptType = new AiPromptTypeEntity();
      promptType.id = definition.id;
      promptType.name = definition.name;
      promptType.description = definition.description;
      promptType.isSystem = true;
      promptType.createdAt = new Date();
      promptType.updatedAt = new Date();
      await this.db.aiPromptTypes.add(promptType);
      changed = true;
    }

    if (changed) {
      await this.db.saveChanges();
    }
  }

  private async readDefaultPromptIdsByType(): Promise<Map<string, string>> {
    const assignments = await this.db.aiPromptTypeDefaults.list({
      orderBy: "updatedAt",
      direction: "desc",
    });

    return new Map(assignments.map((assignment) => [assignment.typeId, assignment.promptId]));
  }

  private async syncDefaultPromptAssignment(input: {
    promptId: string;
    previousType: string | null;
    nextType: string;
    shouldBeDefault: boolean;
    wasDefault?: boolean;
  }): Promise<void> {
    if (input.previousType && input.previousType !== input.nextType) {
      const previousAssignment = await this.db.aiPromptTypeDefaults.findById(input.previousType);
      if (previousAssignment?.promptId === input.promptId) {
        await this.db.aiPromptTypeDefaults.remove(previousAssignment);
      }
    }

    const targetAssignment = await this.db.aiPromptTypeDefaults.findById(input.nextType);
    if (input.shouldBeDefault) {
      if (targetAssignment) {
        targetAssignment.promptId = input.promptId;
        targetAssignment.updatedAt = new Date();
        await this.db.aiPromptTypeDefaults.update(targetAssignment);
      } else {
        const created = new AiPromptTypeDefaultEntity();
        created.typeId = input.nextType;
        created.promptId = input.promptId;
        created.createdAt = new Date();
        created.updatedAt = new Date();
        await this.db.aiPromptTypeDefaults.add(created);
      }
      return;
    }

    if ((input.wasDefault ?? false) && targetAssignment?.promptId === input.promptId) {
      await this.db.aiPromptTypeDefaults.remove(targetAssignment);
    }
  }
}
