// file: packages/ai/src/server/dtos/ai-admin.dto.ts

import { ApiDto, ApiField, defineApiType } from "@genspire/server";
import type {
  IAiAdminChatGenerateRequestDto,
  IAiAdminChatGenerateResponseDto,
  IAiChatMessageDto,
  IAiChatSettingsDto,
  IAiChatToolDto,
  IAiEmbeddingGenerateRequestDto,
  IAiEmbeddingGenerateResponseDto,
  IAiEmbeddingVectorDto,
  IAiSseEventDto,
} from "../contracts.js";

@ApiDto({ description: "AI chat message" })
export class AiChatMessageDto implements IAiChatMessageDto {
  @ApiField({ type: "string" })
  role!: "system" | "user" | "assistant" | "tool";

  @ApiField({ type: "object" })
  content!: unknown;

  @ApiField({ type: "string", required: false })
  name?: string;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "Declarative AI tool definition" })
export class AiChatToolDto implements IAiChatToolDto {
  @ApiField({ type: "string" })
  name!: string;

  @ApiField({ type: "string", required: false })
  description?: string;

  @ApiField({ type: "object", required: false })
  parameters?: Record<string, unknown>;

  @ApiField({ type: "boolean", required: false })
  returnDirect?: boolean;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "AI generation settings" })
export class AiChatSettingsDto implements IAiChatSettingsDto {
  @ApiField({ type: "boolean", required: false })
  stream?: boolean;

  @ApiField({ type: "string", required: false })
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

  @ApiField({ type: "number", required: false })
  temperature?: number;

  @ApiField({ type: "number", required: false })
  topP?: number;

  @ApiField({ type: "number", required: false })
  maxTokens?: number;

  @ApiField({
    arrayOf: () => defineApiType({ type: "string" }),
    required: false,
  })
  stop?: string[];

  @ApiField({ type: "object", required: false })
  toolChoice?: unknown;

  @ApiField({ type: "number", required: false })
  maxToolSteps?: number;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "Admin AI chat generation request" })
export class AiAdminChatGenerateRequestDto implements IAiAdminChatGenerateRequestDto {
  @ApiField({ type: "string", required: false })
  provider?: string;

  @ApiField({ type: "string", required: false })
  model?: string;

  @ApiField({ type: "string", required: false })
  systemPrompt?: string;

  @ApiField({ arrayOf: AiChatMessageDto })
  messages!: AiChatMessageDto[];

  @ApiField({ arrayOf: AiChatToolDto, required: false })
  tools?: AiChatToolDto[];

  @ApiField({ dto: AiChatSettingsDto, required: false })
  settings?: AiChatSettingsDto;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "Admin AI chat generation response" })
export class AiAdminChatGenerateResponseDto implements IAiAdminChatGenerateResponseDto {
  @ApiField({ type: "string", required: false })
  id?: string;

  @ApiField({ type: "string" })
  provider!: string;

  @ApiField({ type: "string" })
  model!: string;

  @ApiField({ dto: AiChatMessageDto })
  message!: AiChatMessageDto;

  @ApiField({ type: "string", required: false })
  finishReason?: string;

  @ApiField({ type: "object", required: false })
  usage?: Record<string, unknown>;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;

  @ApiField({
    arrayOf: () => defineApiType({ type: "object" }),
    required: false,
  })
  toolCalls?: unknown[];

  @ApiField({
    arrayOf: () => defineApiType({ type: "object" }),
    required: false,
  })
  toolResults?: unknown[];
}

@ApiDto({
  description: "AI SSE event payload",
  contentType: "text/event-stream",
})
export class AiSseEventDto implements IAiSseEventDto {
  @ApiField({ type: "string" })
  type!: string;

  @ApiField({ type: "string", required: false })
  sessionId?: string;

  @ApiField({ type: "string", required: false })
  timelineId?: string;

  @ApiField({ type: "string", required: false })
  turnId?: string;

  @ApiField({ type: "string", required: false })
  timelineTurnId?: string;

  @ApiField({ type: "string", required: false })
  generationRunId?: string;

  @ApiField({ type: "string", required: false })
  messageId?: string;

  @ApiField({ type: "string", required: false })
  provider?: string;

  @ApiField({ type: "string", required: false })
  model?: string;

  @ApiField({ type: "string", required: false })
  id?: string;

  @ApiField({ type: "string", required: false })
  delta?: string;

  @ApiField({ type: "string", required: false })
  reasoningDelta?: string;

  @ApiField({ type: "string", required: false })
  finishReason?: string;

  @ApiField({ type: "object", required: false })
  usage?: Record<string, unknown>;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;

  @ApiField({ type: "object", required: false })
  message?: unknown;

  @ApiField({ type: "object", required: false })
  toolCall?: unknown;

  @ApiField({ type: "object", required: false })
  toolResult?: unknown;

  @ApiField({ type: "number", required: false })
  elapsedMs?: number;

  @ApiField({ type: "string", required: false })
  phase?: string;

  @ApiField({ type: "string", required: false })
  error?: string;
}

@ApiDto({ description: "AI embeddings request" })
export class AiEmbeddingGenerateRequestDto implements IAiEmbeddingGenerateRequestDto {
  @ApiField({ type: "string", required: false })
  provider?: string;

  @ApiField({ type: "string", required: false })
  model?: string;

  @ApiField({ type: "object" })
  input!: string | string[];

  @ApiField({ type: "number", required: false })
  dimensions?: number;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "Embedding vector" })
export class AiEmbeddingVectorDto implements IAiEmbeddingVectorDto {
  @ApiField({ type: "number" })
  index!: number;

  @ApiField({ arrayOf: () => defineApiType({ type: "number" }) })
  embedding!: number[];
}

@ApiDto({ description: "AI embeddings response" })
export class AiEmbeddingGenerateResponseDto implements IAiEmbeddingGenerateResponseDto {
  @ApiField({ type: "string" })
  provider!: string;

  @ApiField({ type: "string" })
  model!: string;

  @ApiField({ arrayOf: AiEmbeddingVectorDto })
  embeddings!: AiEmbeddingVectorDto[];

  @ApiField({ type: "object", required: false })
  usage?: Record<string, unknown>;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}
