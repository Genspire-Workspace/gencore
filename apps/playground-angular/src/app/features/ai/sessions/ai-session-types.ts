// file: apps\playground-angular\src\app\features\ai\sessions\ai-session-types.ts

import type { IAiChatMessageDto } from '../shared/ai-chat.types';

export type { IAiChatMessageDto };

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

export interface IAiSessionListResponse {
  items: IAiSessionResponse[];
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
  promptIds?: string[];
  skillIds?: string[];
  promptVariables?: Record<string, unknown>;
  tools?: unknown[];
  settings?: Record<string, unknown>;
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
  requestId?: string;
  error?: string;
}