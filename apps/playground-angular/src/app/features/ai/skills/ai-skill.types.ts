// file: apps\playground-angular\src\app\features\ai\skills\ai-skill.types.ts

export type AiSkillVisibilityDto = 'private' | 'shared' | 'system';
export type AiSkillExecutionModeDto = 'server' | 'client';
export type AiSkillBundleFormatDto = 'inline' | 'zip';

export interface IAiSkillPromptTemplateDto {
  name: string;
  description?: string;
  argumentHint?: string;
  version?: string;
  template: unknown;
  variables?: unknown[];
  metadata?: Record<string, unknown>;
}

export interface IAiSkillResponseDto {
  id: string;
  userId?: string | null;
  visibility: AiSkillVisibilityDto;
  name: string;
  description: string;
  instructions?: string | null;
  compatibility?: string | null;
  license?: string | null;
  metadata?: Record<string, unknown> | null;
  allowedTools?: string[] | null;
  disableModelInvocation: boolean;
  executionMode: AiSkillExecutionModeDto;
  bundleFormat: AiSkillBundleFormatDto;
  bundleStorageFileId?: string | null;
  manifest?: Record<string, unknown> | null;
  registered: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IAiSkillListResponseDto {
  items: IAiSkillResponseDto[];
}

export interface IAiSkillDownloadResponseDto {
  skillId: string;
  fileId: string;
  downloadPath: string;
}

export interface IAiSkillRegistrationResponseDto {
  id: string;
  registered: boolean;
}

export interface ICreateAiSkillRequestDto {
  visibility?: AiSkillVisibilityDto;
  name: string;
  description: string;
  instructions?: string;
  compatibility?: string;
  license?: string;
  metadata?: Record<string, unknown>;
  allowedTools?: string[];
  disableModelInvocation?: boolean;
  executionMode?: AiSkillExecutionModeDto;
  bundleFormat?: AiSkillBundleFormatDto;
  prompts?: IAiSkillPromptTemplateDto[];
  serverToolNames?: string[];
  manifest?: Record<string, unknown>;
}

export interface IUpdateAiSkillRequestDto {
  visibility?: AiSkillVisibilityDto;
  name?: string;
  description?: string;
  instructions?: string;
  compatibility?: string;
  license?: string;
  metadata?: Record<string, unknown>;
  allowedTools?: string[];
  disableModelInvocation?: boolean;
  executionMode?: AiSkillExecutionModeDto;
  bundleFormat?: AiSkillBundleFormatDto;
  prompts?: IAiSkillPromptTemplateDto[];
  serverToolNames?: string[];
  manifest?: Record<string, unknown>;
  registered?: boolean;
}