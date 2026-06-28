// file: packages\ai\src\server\dtos\ai-provider.dto.ts

import { ApiDto, ApiField } from "@genspire/server";

@ApiDto({ description: "AI provider response" })
export class AiProviderResponseDto {
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

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time" })
  updatedAt!: string;
}

@ApiDto({ description: "AI provider list response" })
export class AiProviderListResponseDto {
  @ApiField({ arrayOf: AiProviderResponseDto })
  items!: AiProviderResponseDto[];
}

@ApiDto({ description: "Create AI provider request" })
export class CreateAiProviderRequestDto {
  @ApiField({ type: "string", required: false })
  id?: string;

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

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "Update AI provider request" })
export class UpdateAiProviderRequestDto {
  @ApiField({ type: "string", required: false })
  name?: string;

  @ApiField({ type: "string", required: false })
  kind?: string;

  @ApiField({ type: "string", required: false })
  clientKind?: string;

  @ApiField({ type: "string", required: false })
  baseUrl?: string;

  @ApiField({ type: "string", required: false })
  api?: string;

  @ApiField({ type: "string", required: false })
  doc?: string;

  @ApiField({ type: "string", required: false })
  website?: string;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "Delete response" })
export class DeleteAiProviderResponseDto {
  @ApiField({ type: "boolean" })
  deleted!: boolean;

  @ApiField({ type: "string" })
  id!: string;
}

@ApiDto({ description: "AI model response" })
export class AiModelResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  providerId!: string;

  @ApiField({ type: "string" })
  name!: string;

  @ApiField({ type: "string", required: false })
  family?: string;

  @ApiField({ type: "object", required: false })
  capabilities?: Record<string, unknown>;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time" })
  updatedAt!: string;
}

@ApiDto({ description: "AI model list response" })
export class AiModelListResponseDto {
  @ApiField({ arrayOf: AiModelResponseDto })
  items!: AiModelResponseDto[];
}

@ApiDto({ description: "Create AI model request" })
export class CreateAiModelRequestDto {
  @ApiField({ type: "string" })
  name!: string;

  @ApiField({ type: "string", required: false })
  family?: string;

  @ApiField({ type: "object", required: false })
  capabilities?: Record<string, unknown>;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "Update AI model request" })
export class UpdateAiModelRequestDto {
  @ApiField({ type: "string", required: false })
  name?: string;

  @ApiField({ type: "string", required: false })
  family?: string;

  @ApiField({ type: "object", required: false })
  capabilities?: Record<string, unknown>;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "AI provider API key response (value is masked)" })
export class AiApiKeyResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  providerId!: string;

  @ApiField({ type: "string" })
  userId!: string;

  @ApiField({ type: "string" })
  name!: string;

  @ApiField({ type: "boolean" })
  hasValue!: boolean;

  @ApiField({ type: "string", required: false })
  valuePreview?: string;

  @ApiField({ type: "string", required: false })
  env?: string;

  @ApiField({ type: "boolean" })
  enabled!: boolean;

  @ApiField({ type: "string" })
  source!: string;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time" })
  updatedAt!: string;
}

@ApiDto({ description: "AI API key list response" })
export class AiApiKeyListResponseDto {
  @ApiField({ arrayOf: AiApiKeyResponseDto })
  items!: AiApiKeyResponseDto[];
}

@ApiDto({ description: "Create AI provider API key request" })
export class CreateAiApiKeyRequestDto {
  @ApiField({ type: "string" })
  name!: string;

  @ApiField({ type: "string", required: false })
  value?: string;

  @ApiField({ type: "string", required: false })
  env?: string;

  @ApiField({ type: "boolean", required: false })
  enabled?: boolean;

  @ApiField({ type: "string", required: false })
  source?: string;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "Update AI provider API key request" })
export class UpdateAiApiKeyRequestDto {
  @ApiField({ type: "string", required: false })
  name?: string;

  @ApiField({ type: "string", required: false })
  value?: string;

  @ApiField({ type: "string", required: false })
  env?: string;

  @ApiField({ type: "boolean", required: false })
  enabled?: boolean;

  @ApiField({ type: "string", required: false })
  source?: string;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}