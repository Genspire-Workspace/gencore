import { ApiDto, ApiField } from "@genspire/server";
import type {
  IAiProviderDiscoveryDefaultsDto,
  IAiProviderDiscoveryListResponseDto,
  IAiProviderDiscoveryResponseDto,
} from "../contracts.js";

@ApiDto({ description: "Configured AI provider info" })
export class AiProviderDiscoveryResponseDto implements IAiProviderDiscoveryResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  name!: string;

  @ApiField({ type: "string" })
  kind!: string;

  @ApiField({ type: "string" })
  clientKind!: string;

  @ApiField({ type: "string", required: false })
  baseUrl?: string;

  @ApiField({ type: "string", required: false })
  api?: string;

  @ApiField({ type: "string", required: false })
  doc?: string;

  @ApiField({ type: "string", required: false })
  website?: string;

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

@ApiDto({ description: "Default AI provider and model configuration" })
export class AiProviderDiscoveryDefaultsDto implements IAiProviderDiscoveryDefaultsDto {
  @ApiField({ type: "string", required: false })
  chatProvider?: string;

  @ApiField({ type: "string", required: false })
  chatModel?: string;

  @ApiField({ type: "string", required: false })
  embeddingProvider?: string;

  @ApiField({ type: "string", required: false })
  embeddingModel?: string;
}

@ApiDto({ description: "AI provider discovery response" })
export class AiProviderDiscoveryListResponseDto implements IAiProviderDiscoveryListResponseDto {
  @ApiField({ arrayOf: AiProviderDiscoveryResponseDto })
  providers!: AiProviderDiscoveryResponseDto[];

  @ApiField({ dto: AiProviderDiscoveryDefaultsDto })
  defaults!: AiProviderDiscoveryDefaultsDto;
}
