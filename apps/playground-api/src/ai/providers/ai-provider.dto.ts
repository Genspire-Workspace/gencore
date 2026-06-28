// file: apps/playground-api/src/ai/providers/ai-provider.dto.ts

import { ApiDto, ApiField } from "@genspire/server";

@ApiDto({
  description: "Configured AI provider info",
})
export class AiProviderInfoDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  name!: string;

  @ApiField({ type: "string" })
  kind!: string;

  @ApiField({ type: "boolean" })
  supportsChat!: boolean;

  @ApiField({ type: "boolean" })
  supportsEmbeddings!: boolean;

  @ApiField({ type: "string", required: false })
  defaultChatModel?: string;

  @ApiField({ type: "string", required: false })
  defaultEmbeddingModel?: string;

  @ApiField({ type: "string", required: false })
  host?: string;

  @ApiField({ type: "boolean" })
  configured!: boolean;
}

@ApiDto({
  description: "AI providers listing response",
})
export class AiProvidersResponseDto {
  @ApiField({
    arrayOf: AiProviderInfoDto,
  })
  providers!: AiProviderInfoDto[];

  @ApiField({
    type: "object",
    description: "Default provider and model resolution",
  })
  defaults!: Record<string, unknown>;
}