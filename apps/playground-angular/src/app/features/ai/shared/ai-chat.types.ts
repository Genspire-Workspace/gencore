// file: apps\playground-angular\src\app\features\ai\shared\ai-chat.types.ts

export interface IAiChatMessageDto {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: unknown;
  name?: string;
  metadata?: Record<string, unknown>;
}