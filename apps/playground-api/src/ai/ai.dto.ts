import { ApiDto, ApiField, defineApiType } from "@genspire/server";

export type AiToolExecutionModeDto = "client" | "server";

@ApiDto({
  description: "AI chat message",
})
export class AiChatMessageDto {
  @ApiField({
    type: "string",
    description: "Message role",
  })
  role!: "system" | "user" | "assistant" | "tool";

  @ApiField({
    type: "object",
    description: "Message content",
  })
  content!: unknown;

  @ApiField({
    type: "string",
    description: "Optional message name",
    required: false,
  })
  name?: string;

  @ApiField({
    type: "object",
    description: "Optional message metadata",
    required: false,
  })
  metadata?: Record<string, unknown>;
}

@ApiDto({
  description: "Declarative AI tool definition",
})
export class AiChatToolDto {
  @ApiField({
    type: "string",
    description: "Tool name",
  })
  name!: string;

  @ApiField({
    type: "string",
    description: "Tool description",
    required: false,
  })
  description?: string;

  @ApiField({
    type: "object",
    description: "Tool JSON schema parameters",
    required: false,
  })
  parameters?: Record<string, unknown>;

  @ApiField({
    type: "string",
    description: "Execution ownership for this tool definition",
    required: false,
  })
  executionMode?: AiToolExecutionModeDto;
}

@ApiDto({
  description: "AI chat generation settings",
})
export class AiChatSettingsDto {
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

  @ApiField({
    type: "object",
    description: "Tool choice configuration",
    required: false,
  })
  toolChoice?: unknown;

  @ApiField({ type: "number", required: false })
  maxToolSteps?: number;

  @ApiField({
    type: "object",
    description: "Additional metadata merged into the request",
    required: false,
  })
  metadata?: Record<string, unknown>;
}

@ApiDto({
  description: "AI chat request payload",
})
export class AiChatRequestDto {
  @ApiField({ type: "string", required: false })
  provider?: string;

  @ApiField({ type: "string", required: false })
  model?: string;

  @ApiField({ type: "string", required: false })
  apiKey?: string;

  @ApiField({ type: "string", required: false })
  apiKeyId?: string;

  @ApiField({ type: "string", required: false })
  userId?: string;

  @ApiField({ type: "string", required: false })
  systemPrompt?: string;

  @ApiField({
    arrayOf: AiChatMessageDto,
    description: "Chat messages",
  })
  messages!: AiChatMessageDto[];

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

  @ApiField({
    type: "object",
    required: false,
  })
  metadata?: Record<string, unknown>;
}

@ApiDto({
  description: "AI chat response payload",
})
export class AiChatResponseDto {
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

  @ApiField({ type: "object", required: false })
  raw?: unknown;
}

@ApiDto({
  description: "AI chat stream chunk payload",
})
export class AiChatStreamChunkDto {
  @ApiField({ type: "string", required: false })
  id?: string;

  @ApiField({ type: "string", required: false })
  type?: string;

  @ApiField({ type: "string" })
  provider!: string;

  @ApiField({ type: "string" })
  model!: string;

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
}

@ApiDto({
  description: "AI embeddings request payload",
})
export class AiEmbeddingRequestDto {
  @ApiField({ type: "string", required: false })
  provider?: string;

  @ApiField({ type: "string", required: false })
  model?: string;

  @ApiField({ type: "string", required: false })
  apiKey?: string;

  @ApiField({ type: "string", required: false })
  apiKeyId?: string;

  @ApiField({ type: "string", required: false })
  userId?: string;

  @ApiField({
    type: "object",
    description: "Embedding input string or array of strings",
  })
  input!: string | string[];

  @ApiField({ type: "number", required: false })
  dimensions?: number;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({
  description: "Embedding vector",
})
export class AiEmbeddingVectorDto {
  @ApiField({ type: "number" })
  index!: number;

  @ApiField({
    arrayOf: () => defineApiType({ type: "number" }),
  })
  embedding!: number[];
}

@ApiDto({
  description: "AI embeddings response payload",
})
export class AiEmbeddingResponseDto {
  @ApiField({ type: "string" })
  provider!: string;

  @ApiField({ type: "string" })
  model!: string;

  @ApiField({
    arrayOf: AiEmbeddingVectorDto,
  })
  embeddings!: AiEmbeddingVectorDto[];

  @ApiField({ type: "object", required: false })
  usage?: Record<string, unknown>;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;

  @ApiField({ type: "object", required: false })
  raw?: unknown;
}

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
