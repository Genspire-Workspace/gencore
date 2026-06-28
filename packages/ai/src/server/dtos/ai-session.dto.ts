// file: packages/ai/src/server/dtos/ai-session.dto.ts

import { ApiDto, ApiField, defineApiType } from "@genspire/server";
import { AiChatSettingsDto, AiChatToolDto } from "./ai-admin.dto.js";

@ApiDto({ description: "AI session response" })
export class AiSessionResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  userId!: string;

  @ApiField({ type: "string", required: false })
  title?: string;

  @ApiField({ type: "string" })
  type!: string;

  @ApiField({ type: "string", required: false })
  defaultTimelineId?: string;

  @ApiField({ type: "object", required: false })
  settings?: Record<string, unknown>;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time" })
  updatedAt!: string;
}

@ApiDto({ description: "AI timeline response" })
export class AiSessionTimelineResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  sessionId!: string;

  @ApiField({ type: "string", required: false })
  name?: string;

  @ApiField({ type: "boolean" })
  isDefault!: boolean;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time" })
  updatedAt!: string;
}

@ApiDto({ description: "Create AI session request" })
export class CreateAiSessionRequestDto {
  @ApiField({ type: "string", required: false })
  title?: string;

  @ApiField({ type: "string", required: false })
  type?: "chat";

  @ApiField({ type: "object", required: false })
  settings?: Record<string, unknown>;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "Update AI session request" })
export class UpdateAiSessionRequestDto {
  @ApiField({ type: "string", required: false })
  title?: string;

  @ApiField({ type: "string", required: false })
  type?: "chat";

  @ApiField({ type: "object", required: false })
  settings?: Record<string, unknown> | null;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown> | null;
}

@ApiDto({ description: "AI session list response" })
export class AiSessionListResponseDto {
  @ApiField({ arrayOf: AiSessionResponseDto })
  items!: AiSessionResponseDto[];
}

@ApiDto({ description: "Create AI timeline request" })
export class CreateAiTimelineRequestDto {
  @ApiField({ type: "string", required: false })
  name?: string;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "AI timeline list response" })
export class AiSessionTimelineListResponseDto {
  @ApiField({ arrayOf: AiSessionTimelineResponseDto })
  items!: AiSessionTimelineResponseDto[];
}

@ApiDto({ description: "AI timeline-turn edge response" })
export class AiSessionTimelineTurnResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  sessionId!: string;

  @ApiField({ type: "string" })
  timelineId!: string;

  @ApiField({ type: "string" })
  turnId!: string;

  @ApiField({ type: "number" })
  index!: number;

  @ApiField({ type: "string" })
  source!: string;

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time" })
  updatedAt!: string;
}

@ApiDto({ description: "AI turn response" })
export class AiSessionTurnResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  sessionId!: string;

  @ApiField({ type: "string" })
  status!: string;

  @ApiField({ type: "string", required: false })
  provider?: string;

  @ApiField({ type: "string", required: false })
  model?: string;

  @ApiField({ type: "string", format: "date-time", required: false })
  startedAt?: string;

  @ApiField({ type: "string", format: "date-time", required: false })
  finishedAt?: string;

  @ApiField({ type: "number", required: false })
  durationMs?: number;

  @ApiField({ type: "string", required: false })
  finishReason?: string;

  @ApiField({ type: "string", required: false })
  error?: string;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time" })
  updatedAt!: string;
}

@ApiDto({ description: "AI message response" })
export class AiSessionMessageResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  sessionId!: string;

  @ApiField({ type: "string" })
  turnId!: string;

  @ApiField({ type: "number" })
  index!: number;

  @ApiField({ type: "string" })
  role!: string;

  @ApiField({ type: "object" })
  content!: unknown;

  @ApiField({ type: "string", required: false })
  name?: string;

  @ApiField({ type: "string", required: false })
  provider?: string;

  @ApiField({ type: "string", required: false })
  model?: string;

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

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time" })
  updatedAt!: string;
}

@ApiDto({ description: "AI generation run response" })
export class AiSessionGenerationRunResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  sessionId!: string;

  @ApiField({ type: "string" })
  timelineId!: string;

  @ApiField({ type: "string" })
  turnId!: string;

  @ApiField({ type: "string" })
  status!: string;

  @ApiField({ type: "string", required: false })
  provider?: string;

  @ApiField({ type: "string", required: false })
  model?: string;

  @ApiField({ type: "string", format: "date-time", required: false })
  startedAt?: string;

  @ApiField({ type: "string", format: "date-time", required: false })
  finishedAt?: string;

  @ApiField({ type: "number", required: false })
  durationMs?: number;

  @ApiField({ type: "string", required: false })
  finishReason?: string;

  @ApiField({ type: "object", required: false })
  usage?: Record<string, unknown>;

  @ApiField({ type: "string", required: false })
  error?: string;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time" })
  updatedAt!: string;
}

@ApiDto({ description: "AI message feedback request" })
export class CreateAiMessageFeedbackRequestDto {
  @ApiField({ type: "string" })
  rating!: "good" | "bad";

  @ApiField({ type: "string", required: false, nullable: true })
  comment?: string | null;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "AI message feedback response" })
export class AiSessionMessageFeedbackResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  sessionId!: string;

  @ApiField({ type: "string" })
  messageId!: string;

  @ApiField({ type: "string" })
  userId!: string;

  @ApiField({ type: "string" })
  rating!: "good" | "bad";

  @ApiField({ type: "string", required: false, nullable: true })
  comment?: string | null;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time" })
  updatedAt!: string;
}

@ApiDto({ description: "AI branch response" })
export class AiSessionBranchResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  sessionId!: string;

  @ApiField({ type: "string" })
  sourceTimelineId!: string;

  @ApiField({ type: "string" })
  sourceTurnId!: string;

  @ApiField({ type: "number" })
  sourceTurnIndex!: number;

  @ApiField({ type: "string" })
  targetTimelineId!: string;

  @ApiField({ type: "string" })
  reason!: string;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time" })
  updatedAt!: string;
}

@ApiDto({ description: "AI branch list response" })
export class AiSessionBranchListResponseDto {
  @ApiField({ arrayOf: AiSessionBranchResponseDto })
  items!: AiSessionBranchResponseDto[];
}

@ApiDto({ description: "Create AI branch request" })
export class CreateAiBranchRequestDto {
  @ApiField({ type: "string" })
  sourceTimelineId!: string;

  @ApiField({ type: "string" })
  sourceTurnId!: string;

  @ApiField({ type: "string", required: false })
  name?: string;

  @ApiField({ type: "string", required: false })
  reason?: "manual_branch";

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "Create AI branch response" })
export class CreateAiBranchResponseDto {
  @ApiField({ dto: AiSessionBranchResponseDto })
  branch!: AiSessionBranchResponseDto;

  @ApiField({ dto: AiSessionTimelineResponseDto })
  timeline!: AiSessionTimelineResponseDto;
}

@ApiDto({ description: "Timeline turn detail item" })
export class AiSessionTimelineTurnItemDto {
  @ApiField({ dto: AiSessionTimelineTurnResponseDto })
  timelineTurn!: AiSessionTimelineTurnResponseDto;

  @ApiField({ dto: AiSessionTurnResponseDto })
  turn!: AiSessionTurnResponseDto;

  @ApiField({ arrayOf: AiSessionMessageResponseDto })
  messages!: AiSessionMessageResponseDto[];

  @ApiField({ arrayOf: AiSessionGenerationRunResponseDto })
  generationRuns!: AiSessionGenerationRunResponseDto[];
}

@ApiDto({ description: "Timeline turn list response" })
export class AiSessionTimelineTurnListResponseDto {
  @ApiField({ arrayOf: AiSessionTimelineTurnItemDto })
  items!: AiSessionTimelineTurnItemDto[];
}

@ApiDto({ description: "AI session graph response" })
export class AiSessionGraphDto {
  @ApiField({ dto: AiSessionResponseDto })
  session!: AiSessionResponseDto;

  @ApiField({ arrayOf: AiSessionTimelineResponseDto })
  timelines!: AiSessionTimelineResponseDto[];

  @ApiField({ arrayOf: AiSessionTimelineTurnResponseDto })
  timelineTurns!: AiSessionTimelineTurnResponseDto[];

  @ApiField({ arrayOf: AiSessionTurnResponseDto })
  turns!: AiSessionTurnResponseDto[];

  @ApiField({ arrayOf: AiSessionMessageResponseDto })
  messages!: AiSessionMessageResponseDto[];

  @ApiField({ arrayOf: AiSessionMessageFeedbackResponseDto })
  feedback!: AiSessionMessageFeedbackResponseDto[];

  @ApiField({ arrayOf: AiSessionBranchResponseDto })
  branches!: AiSessionBranchResponseDto[];

  @ApiField({ arrayOf: AiSessionGenerationRunResponseDto })
  generationRuns!: AiSessionGenerationRunResponseDto[];
}

@ApiDto({ description: "Generate session turn request" })
export class GenerateAiSessionTurnRequestDto {
  @ApiField({ type: "object" })
  content!: unknown;

  @ApiField({ type: "string", required: false })
  provider?: string;

  @ApiField({ type: "string", required: false })
  model?: string;

  @ApiField({ type: "string", required: false })
  systemPrompt?: string;

  @ApiField({ arrayOf: AiChatToolDto, required: false })
  tools?: AiChatToolDto[];

  @ApiField({ dto: AiChatSettingsDto, required: false })
  settings?: AiChatSettingsDto;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "Regenerate assistant request" })
export class RegenerateAiAssistantRequestDto {
  @ApiField({ type: "string" })
  sourceTurnId!: string;

  @ApiField({ type: "string", required: false })
  provider?: string;

  @ApiField({ type: "string", required: false })
  model?: string;

  @ApiField({ type: "string", required: false })
  systemPrompt?: string;

  @ApiField({ arrayOf: AiChatToolDto, required: false })
  tools?: AiChatToolDto[];

  @ApiField({ dto: AiChatSettingsDto, required: false })
  settings?: AiChatSettingsDto;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "Edit user and regenerate request" })
export class EditAiUserAndRegenerateRequestDto {
  @ApiField({ type: "string" })
  sourceTurnId!: string;

  @ApiField({ type: "object" })
  content!: unknown;

  @ApiField({ type: "string", required: false })
  provider?: string;

  @ApiField({ type: "string", required: false })
  model?: string;

  @ApiField({ type: "string", required: false })
  systemPrompt?: string;

  @ApiField({ arrayOf: AiChatToolDto, required: false })
  tools?: AiChatToolDto[];

  @ApiField({ dto: AiChatSettingsDto, required: false })
  settings?: AiChatSettingsDto;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "Regeneration bootstrap response" })
export class AiRegenerationBootstrapResponseDto {
  @ApiField({ dto: AiSessionTimelineResponseDto })
  timeline!: AiSessionTimelineResponseDto;

  @ApiField({ dto: AiSessionBranchResponseDto })
  branch!: AiSessionBranchResponseDto;
}
