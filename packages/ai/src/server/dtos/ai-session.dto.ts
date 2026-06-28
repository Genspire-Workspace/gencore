// file: packages/ai/src/server/dtos/ai-session.dto.ts

import { ApiDto, ApiField, defineApiType } from "@genspire/server";
import { AiChatSettingsDto, AiChatToolDto } from "./ai-admin.dto.js";
import type {
  IAiRegenerationBootstrapResponseDto,
  IAiSessionBranchListResponseDto,
  IAiSessionBranchResponseDto,
  IAiSessionGenerationRunResponseDto,
  IAiSessionGraphDto,
  IAiSessionListResponseDto,
  IAiSessionMessageFeedbackResponseDto,
  IAiSessionMessageResponseDto,
  IAiSessionResponseDto,
  IAiSessionTimelineListResponseDto,
  IAiSessionTimelineResponseDto,
  IAiSessionTimelineTurnItemDto,
  IAiSessionTimelineTurnListResponseDto,
  IAiSessionTimelineTurnResponseDto,
  IAiSessionTurnResponseDto,
  ICreateAiBranchRequestDto,
  ICreateAiBranchResponseDto,
  ICreateAiMessageFeedbackRequestDto,
  ICreateAiSessionRequestDto,
  ICreateAiTimelineRequestDto,
  IEditAiUserAndRegenerateRequestDto,
  IGenerateAiSessionTurnRequestDto,
  IRegenerateAiAssistantRequestDto,
  IUpdateAiSessionRequestDto,
} from "../contracts.js";

@ApiDto({ description: "AI session response" })
export class AiSessionResponseDto implements IAiSessionResponseDto {
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

  @ApiField({ dto: () => AiSessionTimelineResponseDto, required: false })
  defaultTimeline?: AiSessionTimelineResponseDto;

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
export class AiSessionTimelineResponseDto implements IAiSessionTimelineResponseDto {
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
export class CreateAiSessionRequestDto implements ICreateAiSessionRequestDto {
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
export class UpdateAiSessionRequestDto implements IUpdateAiSessionRequestDto {
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
export class AiSessionListResponseDto implements IAiSessionListResponseDto {
  @ApiField({ arrayOf: AiSessionResponseDto })
  items!: AiSessionResponseDto[];
}

@ApiDto({ description: "Create AI timeline request" })
export class CreateAiTimelineRequestDto implements ICreateAiTimelineRequestDto {
  @ApiField({ type: "string", required: false })
  name?: string;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "AI timeline list response" })
export class AiSessionTimelineListResponseDto implements IAiSessionTimelineListResponseDto {
  @ApiField({ arrayOf: AiSessionTimelineResponseDto })
  items!: AiSessionTimelineResponseDto[];
}

@ApiDto({ description: "AI timeline-turn edge response" })
export class AiSessionTimelineTurnResponseDto implements IAiSessionTimelineTurnResponseDto {
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
export class AiSessionTurnResponseDto implements IAiSessionTurnResponseDto {
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
export class AiSessionMessageResponseDto implements IAiSessionMessageResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  sessionId!: string;

  @ApiField({ type: "string" })
  turnId!: string;

  @ApiField({ type: "number" })
  index!: number;

  @ApiField({ type: "string" })
  role!: IAiSessionMessageResponseDto["role"];

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
export class AiSessionGenerationRunResponseDto implements IAiSessionGenerationRunResponseDto {
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
export class CreateAiMessageFeedbackRequestDto implements ICreateAiMessageFeedbackRequestDto {
  @ApiField({ type: "string" })
  rating!: "good" | "bad";

  @ApiField({ type: "string", required: false, nullable: true })
  comment?: string | null;

  @ApiField({ type: "object", required: false })
  metadata?: Record<string, unknown>;
}

@ApiDto({ description: "AI message feedback response" })
export class AiSessionMessageFeedbackResponseDto implements IAiSessionMessageFeedbackResponseDto {
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
export class AiSessionBranchResponseDto implements IAiSessionBranchResponseDto {
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
export class AiSessionBranchListResponseDto implements IAiSessionBranchListResponseDto {
  @ApiField({ arrayOf: AiSessionBranchResponseDto })
  items!: AiSessionBranchResponseDto[];
}

@ApiDto({ description: "Create AI branch request" })
export class CreateAiBranchRequestDto implements ICreateAiBranchRequestDto {
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
export class CreateAiBranchResponseDto implements ICreateAiBranchResponseDto {
  @ApiField({ dto: AiSessionBranchResponseDto })
  branch!: AiSessionBranchResponseDto;

  @ApiField({ dto: AiSessionTimelineResponseDto })
  timeline!: AiSessionTimelineResponseDto;
}

@ApiDto({ description: "Timeline turn detail item" })
export class AiSessionTimelineTurnItemDto implements IAiSessionTimelineTurnItemDto {
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
export class AiSessionTimelineTurnListResponseDto implements IAiSessionTimelineTurnListResponseDto {
  @ApiField({ arrayOf: AiSessionTimelineTurnItemDto })
  items!: AiSessionTimelineTurnItemDto[];
}

@ApiDto({ description: "AI session graph response" })
export class AiSessionGraphDto implements IAiSessionGraphDto {
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
export class GenerateAiSessionTurnRequestDto implements IGenerateAiSessionTurnRequestDto {
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
export class RegenerateAiAssistantRequestDto implements IRegenerateAiAssistantRequestDto {
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
export class EditAiUserAndRegenerateRequestDto implements IEditAiUserAndRegenerateRequestDto {
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
export class AiRegenerationBootstrapResponseDto implements IAiRegenerationBootstrapResponseDto {
  @ApiField({ dto: AiSessionTimelineResponseDto })
  timeline!: AiSessionTimelineResponseDto;

  @ApiField({ dto: AiSessionBranchResponseDto })
  branch!: AiSessionBranchResponseDto;
}
