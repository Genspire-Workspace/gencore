// file: apps\playground-angular\src\app\features\ai\prompts\ai-prompt.types.ts

export type AiPromptVisibilityDto = 'private' | 'shared' | 'system';

export interface IAiPromptVariableDto {
  name: string;
  description?: string;
  required?: boolean;
  defaultValue?: unknown;
}

export interface IAiPromptResponseDto {
  id: string;
  userId?: string | null;
  visibility: AiPromptVisibilityDto;
  name: string;
  description?: string | null;
  argumentHint?: string | null;
  version?: string | null;
  template: unknown;
  variables?: IAiPromptVariableDto[] | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface IAiPromptListResponseDto {
  items: IAiPromptResponseDto[];
}

export interface ICreateAiPromptRequestDto {
  visibility?: AiPromptVisibilityDto;
  name: string;
  description?: string;
  argumentHint?: string;
  version?: string;
  template: unknown;
  variables?: IAiPromptVariableDto[];
  metadata?: Record<string, unknown>;
}

export interface IUpdateAiPromptRequestDto {
  visibility?: AiPromptVisibilityDto;
  name?: string;
  description?: string;
  argumentHint?: string;
  version?: string;
  template?: unknown;
  variables?: IAiPromptVariableDto[];
  metadata?: Record<string, unknown>;
}