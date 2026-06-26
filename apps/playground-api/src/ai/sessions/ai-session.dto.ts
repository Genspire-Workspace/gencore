import { ApiDto, ApiField, defineApiType } from "@genspire/server";
import { AiChatMessageDto, AiChatSettingsDto, AiChatToolDto } from "../generation/ai.dto.js";

@ApiDto({
  description: "AI session",
})
export class AiSessionResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  userId!: string;

  @ApiField({ type: "string", required: false })
  title?: string | null;

  @ApiField({ type: "string", required: false })
  provider?: string | null;

  @ApiField({ type: "string", required: false })
  model?: string | null;

  @ApiField({ type: "string", required: false })
  systemPrompt?: string | null;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown> | null;

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time" })
  updatedAt!: string;
}

@ApiDto({
  description: "AI session list response",
})
export class AiSessionListResponseDto {
  @ApiField({
    arrayOf: AiSessionResponseDto,
  })
  items!: AiSessionResponseDto[];
}

@ApiDto({
  description: "Create AI session request",
})
export class CreateAiSessionRequestDto {
  @ApiField({ type: "string", required: false })
  title?: string;

  @ApiField({ type: "string", required: false })
  provider?: string;

  @ApiField({ type: "string", required: false })
  model?: string;

  @ApiField({ type: "string", required: false })
  systemPrompt?: string;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({
  description: "Update AI session request",
})
export class UpdateAiSessionRequestDto {
  @ApiField({ type: "string", required: false })
  title?: string | null;

  @ApiField({ type: "string", required: false })
  provider?: string | null;

  @ApiField({ type: "string", required: false })
  model?: string | null;

  @ApiField({ type: "string", required: false })
  systemPrompt?: string | null;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown> | null;
}

@ApiDto({
  description: "Delete AI session response",
})
export class DeleteAiSessionResponseDto {
  @ApiField({ type: "boolean" })
  deleted!: boolean;
}

@ApiDto({
  description: "AI session message",
})
export class AiSessionMessageDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  sessionId!: string;

  @ApiField({ type: "string" })
  role!: "user" | "assistant" | "system" | "tool";

  @ApiField({ type: "object" })
  content!: unknown;

  @ApiField({ type: "string", required: false })
  name?: string | null;

  @ApiField({ type: "string", required: false })
  provider?: string | null;

  @ApiField({ type: "string", required: false })
  model?: string | null;

  @ApiField({ type: "string", required: false })
  finishReason?: string | null;

  @ApiField({ type: "object", required: false })
  usage?: Record<string, unknown> | null;

  @ApiField({
    arrayOf: () => defineApiType({ type: "object" }),
    required: false,
  })
  toolCalls?: unknown[] | null;

  @ApiField({
    arrayOf: () => defineApiType({ type: "object" }),
    required: false,
  })
  toolResults?: unknown[] | null;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown> | null;

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;
}

@ApiDto({
  description: "AI session message list response",
})
export class AiSessionMessageListResponseDto {
  @ApiField({
    arrayOf: AiSessionMessageDto,
  })
  items!: AiSessionMessageDto[];
}

@ApiDto({
  description: "Generate AI session assistant message request",
})
export class GenerateAiSessionMessageRequestDto {
  @ApiField({ type: "object" })
  content!: string | unknown[];

  @ApiField({ type: "string", required: false })
  provider?: string;

  @ApiField({ type: "string", required: false })
  model?: string;

  @ApiField({ type: "string", required: false })
  apiKey?: string;

  @ApiField({ type: "string", required: false })
  apiKeyId?: string;

  @ApiField({ type: "string", required: false })
  systemPrompt?: string;

  @ApiField({
    arrayOf: () => defineApiType({ type: "string" }),
    required: false,
  })
  promptIds?: string[];

  @ApiField({
    arrayOf: () => defineApiType({ type: "string" }),
    required: false,
  })
  skillIds?: string[];

  @ApiField({ type: "object", required: false })
  promptVariables?: Record<string, unknown>;

  @ApiField({
    arrayOf: AiChatToolDto,
    required: false,
  })
  tools?: AiChatToolDto[];

  @ApiField({
    dto: AiChatSettingsDto,
    required: false,
  })
  settings?: AiChatSettingsDto;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({
  description: "Generate AI session assistant message response",
})
export class GenerateAiSessionMessageResponseDto {
  @ApiField({ type: "string" })
  sessionId!: string;

  @ApiField({ dto: AiSessionMessageDto })
  userMessage!: AiSessionMessageDto;

  @ApiField({ dto: AiSessionMessageDto })
  assistantMessage!: AiSessionMessageDto;

  @ApiField({ type: "string", required: false })
  finishReason?: string;

  @ApiField({ type: "object", required: false })
  usage?: Record<string, unknown>;

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

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({
  description: "Streaming AI session message chunk",
})
export class GenerateAiSessionMessageStreamChunkDto {
  @ApiField({ type: "string", required: false })
  id?: string;

  @ApiField({ type: "string", required: false })
  type?: string;

  @ApiField({ type: "string", required: false })
  provider?: string;

  @ApiField({ type: "string", required: false })
  model?: string;

  @ApiField({ type: "string", required: false })
  delta?: string;

  @ApiField({ type: "string", required: false })
  reasoningDelta?: string;

  @ApiField({ dto: AiChatMessageDto, required: false })
  message?: AiChatMessageDto;

  @ApiField({ type: "object", required: false })
  toolCall?: unknown;

  @ApiField({ type: "object", required: false })
  toolResult?: unknown;

  @ApiField({ type: "string", required: false })
  finishReason?: string;

  @ApiField({ type: "object", required: false })
  usage?: Record<string, unknown>;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;

  @ApiField({ type: "string", required: false })
  sessionId?: string;

  @ApiField({ type: "string", required: false })
  userMessageId?: string;

  @ApiField({ type: "string", required: false })
  assistantMessageId?: string;

  @ApiField({ type: "string", required: false })
  phase?: string;

  @ApiField({ type: "number", required: false })
  elapsedMs?: number;

  @ApiField({ type: "string", required: false })
  toolCallId?: string;

  @ApiField({ type: "string", required: false })
  toolName?: string;
}
