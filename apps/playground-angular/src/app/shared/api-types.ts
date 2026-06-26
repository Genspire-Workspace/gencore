export interface IProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
}

export interface IAuthUser {
  id: string;
  email: string;
  displayName?: string | null;
  emailConfirmed: boolean;
  state: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface IAuthResponse {
  user: IAuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface IStoredAuthState extends IAuthResponse {}

export interface IFileResponse {
  id: string;
  bucket: string;
  key: string;
  originalName: string;
  contentType?: string | null;
  size: number;
  etag?: string | null;
  uploadedBy?: string | null;
  uploaderIp?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IFileListResponse {
  items: IFileResponse[];
  cursor?: string;
  hasMore: boolean;
}

export interface IAiSessionResponse {
  id: string;
  userId: string;
  title?: string | null;
  provider?: string | null;
  model?: string | null;
  systemPrompt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface IAiSessionMessageDto {
  id: string;
  sessionId: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: unknown;
  name?: string | null;
  provider?: string | null;
  model?: string | null;
  finishReason?: string | null;
  usage?: Record<string, unknown> | null;
  toolCalls?: unknown[] | null;
  toolResults?: unknown[] | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface IAiSessionMessageListResponse {
  items: IAiSessionMessageDto[];
}

export interface IAiSessionCreateRequest {
  title?: string;
  provider?: string;
  model?: string;
  systemPrompt?: string;
  metadata?: Record<string, unknown>;
}

export interface IAiSessionMessageRequest {
  content: unknown;
  provider?: string;
  model?: string;
  apiKey?: string;
  apiKeyId?: string;
  systemPrompt?: string;
  tools?: unknown[];
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface IAiChatMessageDto {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: unknown;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface IAiSessionStreamChunk {
  id?: string;
  type?: string;
  provider?: string;
  model?: string;
  delta?: string;
  reasoningDelta?: string;
  message?: IAiChatMessageDto;
  toolCall?: unknown;
  toolResult?: unknown;
  finishReason?: string;
  usage?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  phase?: string;
  elapsedMs?: number;
  toolCallId?: string;
  toolName?: string;
  sessionId?: string;
  userMessageId?: string;
  assistantMessageId?: string;
  error?: string;
}
