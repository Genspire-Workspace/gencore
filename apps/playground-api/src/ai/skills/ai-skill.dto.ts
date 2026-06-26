import { ApiDto, ApiField, defineApiType } from "@genspire/server";
import { AiPromptVariableDto } from "../prompts/ai-prompt.dto.js";

export type AiSkillVisibilityDto = "private" | "shared" | "system";
export type AiSkillExecutionModeDto = "server" | "client";
export type AiSkillBundleFormatDto = "inline" | "zip";

@ApiDto({
  description: "Embedded prompt template stored inside a skill definition",
})
export class AiSkillPromptTemplateDto {
  @ApiField({ type: "string" })
  name!: string;

  @ApiField({ type: "string", required: false })
  description?: string;

  @ApiField({ type: "string", required: false })
  argumentHint?: string;

  @ApiField({ type: "string", required: false })
  version?: string;

  @ApiField({ type: "object" })
  template!: unknown;

  @ApiField({
    arrayOf: AiPromptVariableDto,
    required: false,
  })
  variables?: AiPromptVariableDto[];

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({
  description: "Request payload for creating a managed AI skill",
})
export class CreateAiSkillRequestDto {
  @ApiField({ type: "string", required: false })
  visibility?: AiSkillVisibilityDto;

  @ApiField({ type: "string" })
  name!: string;

  @ApiField({ type: "string" })
  description!: string;

  @ApiField({ type: "string", required: false })
  instructions?: string;

  @ApiField({ type: "string", required: false })
  compatibility?: string;

  @ApiField({ type: "string", required: false })
  license?: string;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;

  @ApiField({
    arrayOf: () => defineApiType({ type: "string" }),
    required: false,
  })
  allowedTools?: string[];

  @ApiField({ type: "boolean", required: false })
  disableModelInvocation?: boolean;

  @ApiField({ type: "string", required: false })
  executionMode?: AiSkillExecutionModeDto;

  @ApiField({ type: "string", required: false })
  bundleFormat?: AiSkillBundleFormatDto;

  @ApiField({
    arrayOf: AiSkillPromptTemplateDto,
    required: false,
  })
  prompts?: AiSkillPromptTemplateDto[];

  @ApiField({
    arrayOf: () => defineApiType({ type: "string" }),
    required: false,
  })
  serverToolNames?: string[];

  @ApiField({ type: "object", required: false })
  manifest?: Record<string, unknown>;
}

@ApiDto({
  description: "Request payload for updating a managed AI skill",
})
export class UpdateAiSkillRequestDto {
  @ApiField({ type: "string", required: false })
  visibility?: AiSkillVisibilityDto;

  @ApiField({ type: "string", required: false })
  name?: string;

  @ApiField({ type: "string", required: false })
  description?: string;

  @ApiField({ type: "string", required: false })
  instructions?: string;

  @ApiField({ type: "string", required: false })
  compatibility?: string;

  @ApiField({ type: "string", required: false })
  license?: string;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;

  @ApiField({
    arrayOf: () => defineApiType({ type: "string" }),
    required: false,
  })
  allowedTools?: string[];

  @ApiField({ type: "boolean", required: false })
  disableModelInvocation?: boolean;

  @ApiField({ type: "string", required: false })
  executionMode?: AiSkillExecutionModeDto;

  @ApiField({ type: "string", required: false })
  bundleFormat?: AiSkillBundleFormatDto;

  @ApiField({
    arrayOf: AiSkillPromptTemplateDto,
    required: false,
  })
  prompts?: AiSkillPromptTemplateDto[];

  @ApiField({
    arrayOf: () => defineApiType({ type: "string" }),
    required: false,
  })
  serverToolNames?: string[];

  @ApiField({ type: "object", required: false })
  manifest?: Record<string, unknown>;

  @ApiField({ type: "boolean", required: false })
  registered?: boolean;
}

@ApiDto({
  description: "Persisted managed AI skill",
})
export class AiSkillResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string", required: false })
  userId?: string | null;

  @ApiField({ type: "string" })
  visibility!: AiSkillVisibilityDto;

  @ApiField({ type: "string" })
  name!: string;

  @ApiField({ type: "string" })
  description!: string;

  @ApiField({ type: "string", required: false })
  instructions?: string | null;

  @ApiField({ type: "string", required: false })
  compatibility?: string | null;

  @ApiField({ type: "string", required: false })
  license?: string | null;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown> | null;

  @ApiField({
    arrayOf: () => defineApiType({ type: "string" }),
    required: false,
  })
  allowedTools?: string[] | null;

  @ApiField({ type: "boolean" })
  disableModelInvocation!: boolean;

  @ApiField({ type: "string" })
  executionMode!: AiSkillExecutionModeDto;

  @ApiField({ type: "string" })
  bundleFormat!: AiSkillBundleFormatDto;

  @ApiField({ type: "string", required: false })
  bundleStorageFileId?: string | null;

  @ApiField({ type: "object", required: false })
  manifest?: Record<string, unknown> | null;

  @ApiField({ type: "boolean" })
  registered!: boolean;

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time" })
  updatedAt!: string;
}

@ApiDto({
  description: "Managed AI skill list response",
})
export class AiSkillListResponseDto {
  @ApiField({
    arrayOf: AiSkillResponseDto,
  })
  items!: AiSkillResponseDto[];
}

@ApiDto({
  description: "Managed AI skill download info",
})
export class AiSkillDownloadResponseDto {
  @ApiField({ type: "string" })
  skillId!: string;

  @ApiField({ type: "string" })
  fileId!: string;

  @ApiField({ type: "string" })
  downloadPath!: string;
}

@ApiDto({
  description: "Managed AI skill registration state response",
})
export class AiSkillRegistrationResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "boolean" })
  registered!: boolean;
}
