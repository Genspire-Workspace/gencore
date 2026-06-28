import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GenError, Scoped } from "@genspire/core";
import type { ICurrentUser } from "@genspire/auth";
import { HttpError } from "@genspire/server";
import { FileService } from "@genspire/storage";
import { defineAiPrompt } from "@genspire/ai/domain";
import type { AiPromptTemplate, IAiPrompt } from "@genspire/ai/domain";
import { defineAiSkill } from "@genspire/ai/domain";
import { loadAiSkillFromDirectory } from "@genspire/ai/application";
import type { IAiSkill } from "@genspire/ai/domain";
import type { IAiTool } from "@genspire/ai/domain";
import { PlaygroundDbContext } from "../../database/playground-db-context.js";
import { aiPlaygroundRuntime } from "../runtime/ai-service-factory.js";
import type { AiPromptVariableDto } from "../prompts/ai-prompt.dto.js";
import { AiSkillEntity, type AiSkillBundleFormat, type AiSkillExecutionMode, type AiSkillVisibility } from "./ai-skill.entity.js";
import type {
  AiSkillDownloadResponseDto,
  AiSkillListResponseDto,
  AiSkillPromptTemplateDto,
  AiSkillRegistrationResponseDto,
  AiSkillResponseDto,
  CreateAiSkillRequestDto,
  UpdateAiSkillRequestDto,
} from "./ai-skill.dto.js";

const SKILL_UPLOAD_BUCKET = "playground-skills";

interface IAiSkillListFilters {
  name?: string;
  ownerUserId?: string;
  visibility?: AiSkillVisibility;
  executionMode?: AiSkillExecutionMode;
}

function isAdmin(currentUser: ICurrentUser | null | undefined): boolean {
  return currentUser?.roles.includes("admin") === true;
}

function canAccessSkill(
  entity: AiSkillEntity,
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

function canMutateSkill(
  entity: AiSkillEntity,
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

function normalizeVisibility(
  visibility: string | undefined,
): AiSkillVisibility {
  if (visibility === "shared" || visibility === "system") {
    return visibility;
  }

  return "private";
}

function normalizeExecutionMode(
  executionMode: string | undefined,
): AiSkillExecutionMode {
  return executionMode === "client" ? "client" : "server";
}

function normalizeBundleFormat(
  bundleFormat: string | undefined,
): AiSkillBundleFormat {
  return bundleFormat === "zip" ? "zip" : "inline";
}

function toPromptDefinition(
  prompt: AiSkillPromptTemplateDto,
  skillName: string,
): IAiPrompt {
  const promptId = `${skillName}:${prompt.name.trim()}`;

  return defineAiPrompt({
    id: promptId,
    name: prompt.name,
    description: prompt.description,
    argumentHint: prompt.argumentHint,
    version: prompt.version,
    template: prompt.template as AiPromptTemplate,
    variables: prompt.variables as AiPromptVariableDto[] | undefined,
    metadata: prompt.metadata,
  });
}

function toSkillResponse(entity: AiSkillEntity): AiSkillResponseDto {
  return {
    id: entity.id,
    userId: entity.userId,
    visibility: entity.visibility,
    name: entity.name,
    description: entity.description,
    instructions: entity.instructions,
    compatibility: entity.compatibility,
    license: entity.license,
    metadata: entity.metadata,
    allowedTools: entity.allowedTools,
    disableModelInvocation: entity.disableModelInvocation,
    executionMode: entity.executionMode,
    bundleFormat: entity.bundleFormat,
    bundleStorageFileId: entity.bundleStorageFileId,
    manifest: entity.manifest,
    registered: entity.registered,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

function buildManifest(
  input: {
    prompts?: AiSkillPromptTemplateDto[];
    serverToolNames?: string[];
    manifest?: Record<string, unknown>;
  },
): Record<string, unknown> {
  return {
    ...(input.manifest ?? {}),
    prompts: (input.prompts ?? []).map((prompt) => ({
      name: prompt.name,
      description: prompt.description,
      argumentHint: prompt.argumentHint,
      version: prompt.version,
      template: prompt.template,
      variables: prompt.variables,
      metadata: prompt.metadata,
    })),
    serverToolNames: input.serverToolNames ?? [],
  };
}

function readUInt16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

function readUInt32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! |
    (bytes[offset + 1]! << 8) |
    (bytes[offset + 2]! << 16) |
    (bytes[offset + 3]! << 24)
  ) >>> 0;
}

function findZipEndOfCentralDirectoryOffset(bytes: Uint8Array): number {
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (readUInt32LE(bytes, offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new GenError(
    "Failed to locate the ZIP end-of-central-directory record.",
    "AI_SKILL_IMPORT_ERROR",
  );
}

function resolveZipOutputPath(outputDirectory: string, relativePath: string): string {
  const normalizedRelativePath = relativePath.replaceAll("\\", "/");
  const targetPath = path.resolve(outputDirectory, normalizedRelativePath);
  const relativeToRoot = path.relative(path.resolve(outputDirectory), targetPath);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    throw new GenError(
      `Skill archive entry '${relativePath}' escapes the extraction root.`,
      "AI_SKILL_IMPORT_ERROR",
    );
  }

  return targetPath;
}

async function inflateZipEntry(compressedBytes: Uint8Array): Promise<Uint8Array> {
  const decompressedStream = new Blob([compressedBytes])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));

  return new Uint8Array(await new Response(decompressedStream).arrayBuffer());
}

async function extractZipArchive(zipPath: string, outputDirectory: string): Promise<void> {
  const archiveBytes = new Uint8Array(await Bun.file(zipPath).arrayBuffer());
  const endOfCentralDirectoryOffset = findZipEndOfCentralDirectoryOffset(archiveBytes);
  const totalEntries = readUInt16LE(archiveBytes, endOfCentralDirectoryOffset + 10);
  let centralDirectoryOffset = readUInt32LE(archiveBytes, endOfCentralDirectoryOffset + 16);
  const decoder = new TextDecoder();

  for (let entryIndex = 0; entryIndex < totalEntries; entryIndex += 1) {
    if (readUInt32LE(archiveBytes, centralDirectoryOffset) !== 0x02014b50) {
      throw new GenError(
        "Invalid ZIP central directory entry.",
        "AI_SKILL_IMPORT_ERROR",
      );
    }

    const compressionMethod = readUInt16LE(archiveBytes, centralDirectoryOffset + 10);
    const compressedSize = readUInt32LE(archiveBytes, centralDirectoryOffset + 20);
    const fileNameLength = readUInt16LE(archiveBytes, centralDirectoryOffset + 28);
    const extraFieldLength = readUInt16LE(archiveBytes, centralDirectoryOffset + 30);
    const commentLength = readUInt16LE(archiveBytes, centralDirectoryOffset + 32);
    const localHeaderOffset = readUInt32LE(archiveBytes, centralDirectoryOffset + 42);
    const fileNameBytes = archiveBytes.slice(
      centralDirectoryOffset + 46,
      centralDirectoryOffset + 46 + fileNameLength,
    );
    const fileName = decoder.decode(fileNameBytes);

    centralDirectoryOffset += 46 + fileNameLength + extraFieldLength + commentLength;

    if (fileName.endsWith("/")) {
      continue;
    }

    if (readUInt32LE(archiveBytes, localHeaderOffset) !== 0x04034b50) {
      throw new GenError(
        `ZIP entry '${fileName}' has an invalid local file header.`,
        "AI_SKILL_IMPORT_ERROR",
      );
    }

    const localFileNameLength = readUInt16LE(archiveBytes, localHeaderOffset + 26);
    const localExtraFieldLength = readUInt16LE(archiveBytes, localHeaderOffset + 28);
    const fileDataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;
    const compressedBytes = archiveBytes.slice(
      fileDataOffset,
      fileDataOffset + compressedSize,
    );

    const outputPath = resolveZipOutputPath(outputDirectory, fileName);
    await mkdir(path.dirname(outputPath), { recursive: true });

    if (compressionMethod === 0) {
      await writeFile(outputPath, compressedBytes);
      continue;
    }

    if (compressionMethod === 8) {
      await writeFile(outputPath, await inflateZipEntry(compressedBytes));
      continue;
    }

    throw new GenError(
      `ZIP entry '${fileName}' uses unsupported compression method '${compressionMethod}'.`,
      "AI_SKILL_IMPORT_ERROR",
    );
  }
}

async function findSkillRootDirectory(rootDirectory: string): Promise<string> {
  const directSkillMarkdown = path.join(rootDirectory, "SKILL.md");

  if (await Bun.file(directSkillMarkdown).exists()) {
    return rootDirectory;
  }

  const entries = await readdir(rootDirectory, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory());

  for (const directory of directories) {
    const candidate = path.join(rootDirectory, directory.name);

    if (await Bun.file(path.join(candidate, "SKILL.md")).exists()) {
      return candidate;
    }
  }

  throw new GenError(
    "Skill archive must contain a SKILL.md file at the root or inside a single top-level directory.",
    "AI_SKILL_IMPORT_ERROR",
  );
}

function normalizeImportedManifest(skill: IAiSkill): Record<string, unknown> {
  return {
    prompts: (skill.prompts ?? []).map((prompt) => ({
      id: prompt.id,
      name: prompt.name,
      description: prompt.description,
      argumentHint: prompt.argumentHint,
      version: prompt.version,
      template: prompt.template,
      variables: prompt.variables ?? [],
      metadata: prompt.metadata ?? {},
    })),
    files: (skill.files ?? []).map((file) => ({
      path: file.path,
      kind: file.kind,
      metadata: file.metadata,
    })),
  };
}

@Scoped()
export class AiSkillService {
  static inject = [PlaygroundDbContext, FileService];

  constructor(
    private readonly db: PlaygroundDbContext,
    private readonly fileService: FileService,
  ) {}

  async listAccessible(
    currentUser: ICurrentUser | null,
    filters: IAiSkillListFilters = {},
  ): Promise<AiSkillListResponseDto> {
    const skills = await this.db.aiSkills.list({
      orderBy: "updatedAt",
      direction: "desc",
    });
    const normalizedName = filters.name?.trim().toLowerCase();

    return {
      items: skills
        .filter((entity) => canAccessSkill(entity, currentUser))
        .filter((entity) => !filters.visibility || entity.visibility === filters.visibility)
        .filter((entity) => !filters.executionMode || entity.executionMode === filters.executionMode)
        .filter((entity) => !filters.ownerUserId || entity.userId === filters.ownerUserId)
        .filter((entity) =>
          !normalizedName ||
          entity.name.toLowerCase().includes(normalizedName) ||
          entity.description.toLowerCase().includes(normalizedName),
        )
        .map(toSkillResponse),
    };
  }

  async create(
    currentUser: ICurrentUser,
    input: CreateAiSkillRequestDto,
  ): Promise<AiSkillResponseDto> {
    const visibility = normalizeVisibility(input.visibility);
    const executionMode = normalizeExecutionMode(input.executionMode);
    const bundleFormat = normalizeBundleFormat(input.bundleFormat);

    if (visibility === "system" && !isAdmin(currentUser)) {
      throw new HttpError(403, "Only admins can create system skills.");
    }

    if (bundleFormat === "zip") {
      throw new HttpError(400, "Use /ai/skills/import for zip-backed skills.");
    }

    if (executionMode === "client" && input.serverToolNames?.length) {
      throw new HttpError(400, "Client skills cannot declare server tool bindings.");
    }

    defineAiSkill({
      name: input.name,
      description: input.description,
      instructions: input.instructions,
      compatibility: input.compatibility,
      license: input.license,
      metadata: input.metadata,
      allowedTools: input.allowedTools,
      disableModelInvocation: input.disableModelInvocation,
      prompts: (input.prompts ?? []).map((prompt) => toPromptDefinition(prompt, input.name)),
    });

    const entity = new AiSkillEntity();
    entity.id = crypto.randomUUID();
    entity.userId = visibility === "system" ? null : currentUser.id;
    entity.visibility = visibility;
    entity.name = input.name;
    entity.description = input.description;
    entity.instructions = input.instructions ?? null;
    entity.compatibility = input.compatibility ?? null;
    entity.license = input.license ?? null;
    entity.metadata = input.metadata ?? null;
    entity.allowedTools = input.allowedTools ?? null;
    entity.disableModelInvocation = input.disableModelInvocation === true;
    entity.executionMode = executionMode;
    entity.bundleFormat = "inline";
    entity.bundleStorageFileId = null;
    entity.manifest = buildManifest(input);
    entity.registered = true;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();

    await this.db.aiSkills.add(entity);
    await this.db.saveChanges();

    return toSkillResponse(entity);
  }

  async importZipBundle(
    currentUser: ICurrentUser,
    input: {
      file: Blob;
      originalName: string;
      visibility?: string;
      description?: string;
    },
  ): Promise<AiSkillResponseDto> {
    const visibility = normalizeVisibility(input.visibility);

    if (visibility === "system" && !isAdmin(currentUser)) {
      throw new HttpError(403, "Only admins can create system skills.");
    }

    const workingRoot = await mkdtemp(path.join(os.tmpdir(), "gencore-skill-import-"));
    const zipPath = path.join(workingRoot, input.originalName || "skill.zip");
    const extractedPath = path.join(workingRoot, "extracted");

    try {
      await mkdir(extractedPath, { recursive: true });
      await writeFile(zipPath, new Uint8Array(await input.file.arrayBuffer()));
      await extractZipArchive(zipPath, extractedPath);

      const skillRoot = await findSkillRootDirectory(extractedPath);
      const parsedSkill = await loadAiSkillFromDirectory(skillRoot, {
        includeTools: false,
        repositoryRoot: process.cwd(),
      });
      const uploadedBundle = await this.fileService.upload({
        file: input.file,
        originalName: input.originalName,
        bucket: SKILL_UPLOAD_BUCKET,
        userId: currentUser.id,
        uploadedBy: currentUser.id,
      });

      const entity = new AiSkillEntity();
      entity.id = crypto.randomUUID();
      entity.userId = visibility === "system" ? null : currentUser.id;
      entity.visibility = visibility;
      entity.name = parsedSkill.name;
      entity.description = input.description?.trim() || parsedSkill.description;
      entity.instructions = parsedSkill.instructions ?? null;
      entity.compatibility = parsedSkill.compatibility ?? null;
      entity.license = parsedSkill.license ?? null;
      entity.metadata = parsedSkill.metadata ?? null;
      entity.allowedTools = parsedSkill.allowedTools ? [...parsedSkill.allowedTools] : null;
      entity.disableModelInvocation = parsedSkill.disableModelInvocation === true;
      entity.executionMode = "client";
      entity.bundleFormat = "zip";
      entity.bundleStorageFileId = uploadedBundle.id;
      entity.manifest = normalizeImportedManifest(parsedSkill);
      entity.registered = true;
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      await this.db.aiSkills.add(entity);
      await this.db.saveChanges();

      return toSkillResponse(entity);
    } finally {
      await rm(workingRoot, { recursive: true, force: true });
    }
  }

  async getAccessibleById(
    currentUser: ICurrentUser | null,
    id: string,
  ): Promise<AiSkillResponseDto | null> {
    const entity = await this.db.aiSkills.findById(id);

    if (!entity || !canAccessSkill(entity, currentUser)) {
      return null;
    }

    return toSkillResponse(entity);
  }

  async updateById(
    currentUser: ICurrentUser,
    id: string,
    input: UpdateAiSkillRequestDto,
  ): Promise<AiSkillResponseDto | null> {
    const entity = await this.db.aiSkills.findById(id);

    if (!entity || !canAccessSkill(entity, currentUser)) {
      return null;
    }

    if (!canMutateSkill(entity, currentUser)) {
      throw new HttpError(403, "You do not have permission to update this skill.");
    }

    if (input.visibility !== undefined) {
      const visibility = normalizeVisibility(input.visibility);

      if (visibility === "system" && !isAdmin(currentUser)) {
        throw new HttpError(403, "Only admins can move skills to system visibility.");
      }

      entity.visibility = visibility;
      entity.userId = visibility === "system" ? null : entity.userId ?? currentUser.id;
    }

    if (input.executionMode !== undefined) {
      entity.executionMode = normalizeExecutionMode(input.executionMode);
    }

    if (entity.executionMode === "client" && input.serverToolNames?.length) {
      throw new HttpError(400, "Client skills cannot declare server tool bindings.");
    }

    if (input.name !== undefined) {
      entity.name = input.name;
    }

    if (input.description !== undefined) {
      entity.description = input.description;
    }

    if (input.instructions !== undefined) {
      entity.instructions = input.instructions ?? null;
    }

    if (input.compatibility !== undefined) {
      entity.compatibility = input.compatibility ?? null;
    }

    if (input.license !== undefined) {
      entity.license = input.license ?? null;
    }

    if (input.metadata !== undefined) {
      entity.metadata = input.metadata ?? null;
    }

    if (input.allowedTools !== undefined) {
      entity.allowedTools = input.allowedTools ?? null;
    }

    if (input.disableModelInvocation !== undefined) {
      entity.disableModelInvocation = input.disableModelInvocation;
    }

    if (input.bundleFormat !== undefined) {
      entity.bundleFormat = normalizeBundleFormat(input.bundleFormat);
    }

    if (input.registered !== undefined) {
      entity.registered = input.registered;
    }

    const prompts = input.prompts ?? (entity.manifest?.prompts as AiSkillPromptTemplateDto[] | undefined);
    const serverToolNames = input.serverToolNames ?? (entity.manifest?.serverToolNames as string[] | undefined);
    const manifest = buildManifest({
      prompts,
      serverToolNames,
      manifest: input.manifest ?? entity.manifest ?? undefined,
    });

    defineAiSkill({
      name: entity.name,
      description: entity.description,
      instructions: entity.instructions ?? undefined,
      compatibility: entity.compatibility ?? undefined,
      license: entity.license ?? undefined,
      metadata: entity.metadata ?? undefined,
      allowedTools: entity.allowedTools ?? undefined,
      disableModelInvocation: entity.disableModelInvocation,
      prompts: (prompts ?? []).map((prompt) => toPromptDefinition(prompt, entity.name)),
    });

    entity.manifest = manifest;

    await this.db.aiSkills.update(entity);
    await this.db.saveChanges();

    return toSkillResponse(entity);
  }

  async deleteById(
    currentUser: ICurrentUser,
    id: string,
  ): Promise<boolean> {
    const entity = await this.db.aiSkills.findById(id);

    if (!entity || !canAccessSkill(entity, currentUser)) {
      return false;
    }

    if (!canMutateSkill(entity, currentUser)) {
      throw new HttpError(403, "You do not have permission to delete this skill.");
    }

    await this.db.aiSkills.remove(entity);
    await this.db.saveChanges();

    return true;
  }

  async setRegisteredById(
    currentUser: ICurrentUser,
    id: string,
    registered: boolean,
  ): Promise<AiSkillRegistrationResponseDto | null> {
    const entity = await this.db.aiSkills.findById(id);

    if (!entity || !canAccessSkill(entity, currentUser)) {
      return null;
    }

    if (!canMutateSkill(entity, currentUser)) {
      throw new HttpError(403, "You do not have permission to modify this skill.");
    }

    entity.registered = registered;
    await this.db.aiSkills.update(entity);
    await this.db.saveChanges();

    return {
      id: entity.id,
      registered: entity.registered,
    };
  }

  async getDownloadInfo(
    currentUser: ICurrentUser | null,
    id: string,
  ): Promise<AiSkillDownloadResponseDto | null> {
    const entity = await this.db.aiSkills.findById(id);

    if (!entity || !canAccessSkill(entity, currentUser) || !entity.bundleStorageFileId) {
      return null;
    }

    return {
      skillId: entity.id,
      fileId: entity.bundleStorageFileId,
      downloadPath: `/file/${entity.bundleStorageFileId}`,
    };
  }

  async resolveSkillsByIds(
    currentUser: ICurrentUser | null,
    skillIds: readonly string[],
  ): Promise<IAiSkill[]> {
    const skills: IAiSkill[] = [];

    for (const skillId of skillIds) {
      const entity = await this.db.aiSkills.findById(skillId);

      if (!entity || !canAccessSkill(entity, currentUser)) {
        throw new HttpError(404, `AI skill '${skillId}' was not found.`);
      }

      if (!entity.registered) {
        throw new HttpError(400, `AI skill '${skillId}' is not registered.`);
      }

      const promptDefinitions = Array.isArray(entity.manifest?.prompts)
        ? entity.manifest!.prompts as AiSkillPromptTemplateDto[]
        : [];
      const prompts = promptDefinitions.map((prompt) =>
        toPromptDefinition(prompt, entity.name)
      );
      const serverToolNames = Array.isArray(entity.manifest?.serverToolNames)
        ? entity.manifest!.serverToolNames as string[]
        : [];
      const tools: IAiTool[] = [];

      if (entity.executionMode === "server") {
        for (const toolName of serverToolNames) {
          const resolvedTool = aiPlaygroundRuntime.serverToolRegistry.tryGet(toolName);

          if (!resolvedTool) {
            throw new HttpError(500, `AI skill '${entity.name}' references unknown server tool '${toolName}'.`);
          }

          if (entity.allowedTools && !entity.allowedTools.includes(toolName)) {
            continue;
          }

          tools.push(resolvedTool);
        }
      }

      skills.push(defineAiSkill({
        name: entity.name,
        description: entity.description,
        instructions: entity.instructions ?? undefined,
        compatibility: entity.compatibility ?? undefined,
        license: entity.license ?? undefined,
        metadata: {
          ...(entity.metadata ?? {}),
          visibility: entity.visibility,
          executionMode: entity.executionMode,
          bundleFormat: entity.bundleFormat,
          bundleStorageFileId: entity.bundleStorageFileId,
        },
        allowedTools: entity.allowedTools ?? undefined,
        disableModelInvocation: entity.disableModelInvocation,
        prompts,
        tools,
      }));
    }

    return skills;
  }
}
