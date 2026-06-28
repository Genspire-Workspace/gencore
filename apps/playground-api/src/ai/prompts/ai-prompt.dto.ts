import { ApiDto, ApiField, defineApiType } from "@genspire/server";
import { AiChatMessageDto } from "@genspire/ai/server";

export type AiPromptVisibilityDto = "private" | "shared" | "system";

@ApiDto({
  description: "AI prompt variable definition",
})
export class AiPromptVariableDto {
  @ApiField({ type: "string" })
  name!: string;

  @ApiField({ type: "string", required: false })
  description?: string;

  @ApiField({ type: "boolean", required: false })
  required?: boolean;

  @ApiField({ type: "object", required: false })
  defaultValue?: unknown;
}

@ApiDto({
  description: "Request payload for creating an AI prompt",
})
export class CreateAiPromptRequestDto {
  @ApiField({ type: "string", required: false })
  visibility?: AiPromptVisibilityDto;

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
  description: "Request payload for updating an AI prompt",
})
export class UpdateAiPromptRequestDto {
  @ApiField({ type: "string", required: false })
  visibility?: AiPromptVisibilityDto;

  @ApiField({ type: "string", required: false })
  name?: string;

  @ApiField({ type: "string", required: false })
  description?: string;

  @ApiField({ type: "string", required: false })
  argumentHint?: string;

  @ApiField({ type: "string", required: false })
  version?: string;

  @ApiField({ type: "object", required: false })
  template?: unknown;

  @ApiField({
    arrayOf: AiPromptVariableDto,
    required: false,
  })
  variables?: AiPromptVariableDto[];

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({
  description: "Persisted AI prompt",
})
export class AiPromptResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string", required: false })
  userId?: string | null;

  @ApiField({ type: "string" })
  visibility!: AiPromptVisibilityDto;

  @ApiField({ type: "string" })
  name!: string;

  @ApiField({ type: "string", required: false })
  description?: string | null;

  @ApiField({ type: "string", required: false })
  argumentHint?: string | null;

  @ApiField({ type: "string", required: false })
  version?: string | null;

  @ApiField({ type: "object" })
  template!: unknown;

  @ApiField({
    arrayOf: AiPromptVariableDto,
    required: false,
  })
  variables?: AiPromptVariableDto[] | null;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown> | null;

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time" })
  updatedAt!: string;
}

@ApiDto({
  description: "AI prompt list response",
})
export class AiPromptListResponseDto {
  @ApiField({
    arrayOf: AiPromptResponseDto,
  })
  items!: AiPromptResponseDto[];
}

@ApiDto({
  description: "Request payload for rendering an AI prompt",
})
export class RenderAiPromptRequestDto {
  @ApiField({ type: "object", required: false })
  variables?: Record<string, unknown>;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({
  description: "Rendered AI prompt",
})
export class RenderAiPromptResponseDto {
  @ApiField({
    arrayOf: AiChatMessageDto,
  })
  messages!: AiChatMessageDto[];

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

export const aiPromptVisibilityApiType = defineApiType({
  type: "string",
  enum: ["private", "shared", "system"],
});
