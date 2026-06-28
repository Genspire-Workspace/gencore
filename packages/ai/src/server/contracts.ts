export type AiSessionMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface IAiChatMessageDto {
  role: AiSessionMessageRole;
  content: unknown;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface IAiChatToolDto {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  returnDirect?: boolean;
  metadata?: Record<string, unknown>;
}

export interface IAiChatSettingsDto {
  stream?: boolean;
  reasoningEffort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stop?: string[];
  toolChoice?: unknown;
  maxToolSteps?: number;
  metadata?: Record<string, unknown>;
}

export interface IAiAdminChatGenerateRequestDto {
  provider?: string;
  model?: string;
  systemPrompt?: string;
  messages: IAiChatMessageDto[];
  tools?: IAiChatToolDto[];
  settings?: IAiChatSettingsDto;
  metadata?: Record<string, unknown>;
}

export interface IAiAdminChatGenerateResponseDto {
  id?: string;
  provider: string;
  model: string;
  message: IAiChatMessageDto;
  finishReason?: string;
  usage?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  toolCalls?: unknown[];
  toolResults?: unknown[];
}

export interface IAiEmbeddingVectorDto {
  index: number;
  embedding: number[];
}

export interface IAiEmbeddingGenerateRequestDto {
  provider?: string;
  model?: string;
  input: string | string[];
  dimensions?: number;
  metadata?: Record<string, unknown>;
}

export interface IAiEmbeddingGenerateResponseDto {
  provider: string;
  model: string;
  embeddings: IAiEmbeddingVectorDto[];
  usage?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface IAiProviderResponseDto {
  id: string;
  name: string;
  kind: string;
  clientKind: string;
  baseUrl?: string;
  api?: string;
  doc?: string;
  website?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IAiProviderListResponseDto {
  items: IAiProviderResponseDto[];
}

export interface ICreateAiProviderRequestDto {
  id?: string;
  name: string;
  kind: string;
  clientKind: string;
  baseUrl?: string;
  api?: string;
  doc?: string;
  website?: string;
  metadata?: Record<string, unknown>;
}

export interface IUpdateAiProviderRequestDto {
  name?: string;
  kind?: string;
  clientKind?: string;
  baseUrl?: string;
  api?: string;
  doc?: string;
  website?: string;
  metadata?: Record<string, unknown>;
}

export interface IDeleteAiProviderResponseDto {
  deleted: boolean;
  id: string;
}

export interface IAiModelResponseDto {
  id: string;
  providerId: string;
  name: string;
  family?: string;
  capabilities?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IAiModelListResponseDto {
  items: IAiModelResponseDto[];
}

export interface ICreateAiModelRequestDto {
  name: string;
  family?: string;
  capabilities?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface IUpdateAiModelRequestDto {
  name?: string;
  family?: string;
  capabilities?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface IAiApiKeyResponseDto {
  id: string;
  providerId: string;
  userId: string;
  name: string;
  hasValue: boolean;
  valuePreview?: string;
  env?: string;
  enabled: boolean;
  source: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IAiApiKeyListResponseDto {
  items: IAiApiKeyResponseDto[];
}

export interface ICreateAiApiKeyRequestDto {
  name: string;
  value?: string;
  env?: string;
  enabled?: boolean;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface IUpdateAiApiKeyRequestDto {
  name?: string;
  value?: string;
  env?: string;
  enabled?: boolean;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface IAiSessionTimelineResponseDto {
  id: string;
  sessionId: string;
  name?: string;
  isDefault: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IAiSessionResponseDto {
  id: string;
  userId: string;
  title?: string;
  type: string;
  defaultTimelineId?: string;
  defaultTimeline?: IAiSessionTimelineResponseDto;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IAiSessionListResponseDto {
  items: IAiSessionResponseDto[];
}

export interface ICreateAiSessionRequestDto {
  title?: string;
  type?: 'chat';
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface IUpdateAiSessionRequestDto {
  title?: string;
  type?: 'chat';
  settings?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface IAiSessionTurnResponseDto {
  id: string;
  sessionId: string;
  status: string;
  provider?: string;
  model?: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  finishReason?: string;
  error?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IAiSessionMessageResponseDto {
  id: string;
  sessionId: string;
  turnId: string;
  index: number;
  role: AiSessionMessageRole;
  content: unknown;
  name?: string;
  provider?: string;
  model?: string;
  usage?: Record<string, unknown>;
  toolCalls?: unknown[];
  toolResults?: unknown[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IAiSessionTimelineTurnResponseDto {
  id: string;
  sessionId: string;
  timelineId: string;
  turnId: string;
  index: number;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAiSessionGenerationRunResponseDto {
  id: string;
  sessionId: string;
  timelineId: string;
  turnId: string;
  status: string;
  provider?: string;
  model?: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  finishReason?: string;
  usage?: Record<string, unknown>;
  error?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IAiSessionTimelineTurnItemDto {
  timelineTurn: IAiSessionTimelineTurnResponseDto;
  turn: IAiSessionTurnResponseDto;
  messages: IAiSessionMessageResponseDto[];
  generationRuns: IAiSessionGenerationRunResponseDto[];
}

export interface IAiSessionTimelineTurnListResponseDto {
  items: IAiSessionTimelineTurnItemDto[];
}

export interface IAiSessionMessageFeedbackResponseDto {
  id: string;
  sessionId: string;
  messageId: string;
  userId: string;
  rating: 'good' | 'bad';
  comment?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateAiMessageFeedbackRequestDto {
  rating: 'good' | 'bad';
  comment?: string | null;
  metadata?: Record<string, unknown>;
}

export interface IAiSessionBranchResponseDto {
  id: string;
  sessionId: string;
  sourceTimelineId: string;
  sourceTurnId: string;
  sourceTurnIndex: number;
  targetTimelineId: string;
  reason: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IAiSessionGraphDto {
  session: IAiSessionResponseDto;
  timelines: IAiSessionTimelineResponseDto[];
  timelineTurns: IAiSessionTimelineTurnResponseDto[];
  turns: IAiSessionTurnResponseDto[];
  messages: IAiSessionMessageResponseDto[];
  feedback: IAiSessionMessageFeedbackResponseDto[];
  branches: IAiSessionBranchResponseDto[];
  generationRuns: IAiSessionGenerationRunResponseDto[];
}

export interface IGenerateAiSessionTurnRequestDto {
  content: unknown;
  provider?: string;
  model?: string;
  systemPrompt?: string;
  tools?: IAiChatToolDto[];
  settings?: IAiChatSettingsDto;
  metadata?: Record<string, unknown>;
}

export interface ICreateAiTimelineRequestDto {
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface IAiSessionTimelineListResponseDto {
  items: IAiSessionTimelineResponseDto[];
}

export interface IAiSessionBranchListResponseDto {
  items: IAiSessionBranchResponseDto[];
}

export interface ICreateAiBranchRequestDto {
  sourceTimelineId: string;
  sourceTurnId: string;
  name?: string;
  reason?: 'manual_branch';
  metadata?: Record<string, unknown>;
}

export interface ICreateAiBranchResponseDto {
  branch: IAiSessionBranchResponseDto;
  timeline: IAiSessionTimelineResponseDto;
}

export interface IRegenerateAiAssistantRequestDto {
  sourceTurnId: string;
  provider?: string;
  model?: string;
  systemPrompt?: string;
  tools?: IAiChatToolDto[];
  settings?: IAiChatSettingsDto;
  metadata?: Record<string, unknown>;
}

export interface IEditAiUserAndRegenerateRequestDto {
  sourceTurnId: string;
  content: unknown;
  provider?: string;
  model?: string;
  systemPrompt?: string;
  tools?: IAiChatToolDto[];
  settings?: IAiChatSettingsDto;
  metadata?: Record<string, unknown>;
}

export interface IAiRegenerationBootstrapResponseDto {
  timeline: IAiSessionTimelineResponseDto;
  branch: IAiSessionBranchResponseDto;
}

export interface IAiSseEventDto {
  type:
    | 'started'
    | 'delta'
    | 'reasoning_delta'
    | 'tool_call'
    | 'tool_result'
    | 'heartbeat'
    | 'message'
    | 'completed'
    | 'error';
  sessionId?: string;
  timelineId?: string;
  turnId?: string;
  timelineTurnId?: string;
  generationRunId?: string;
  messageId?: string;
  provider?: string;
  model?: string;
  id?: string;
  delta?: string;
  reasoningDelta?: string;
  finishReason?: string;
  usage?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  message?: IAiSessionMessageResponseDto;
  toolCall?: unknown;
  toolResult?: unknown;
  elapsedMs?: number;
  phase?: string;
  error?: string;
}
