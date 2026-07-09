import type {
  AiPromptType,
  AiPromptTemplate,
  IAiPrompt,
  IAiPromptVariable,
} from "@genspire/ai/domain/prompts";

export type {
  AiPromptType,
  AiPromptTemplate,
  IAiPrompt,
  IAiPromptVariable,
};

export type AiPromptVisibilityDto = "private" | "shared" | "system";

export interface IAiPromptResponseDto extends IAiPrompt {
  userId?: string | null;
  visibility: AiPromptVisibilityDto;
  createdAt: string;
  updatedAt: string;
}

export interface IAiPromptListResponseDto {
  items: IAiPromptResponseDto[];
}

export interface IAiPromptTypeResponseDto {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IAiPromptTypeListResponseDto {
  items: IAiPromptTypeResponseDto[];
}

export interface ICreateAiPromptRequestDto {
  visibility?: AiPromptVisibilityDto;
  type?: AiPromptType;
  isDefault?: boolean;
  name: string;
  description?: string;
  argumentHint?: string;
  version?: string;
  variables?: readonly IAiPromptVariable[];
  template: AiPromptTemplate;
  metadata?: Record<string, unknown>;
}

export interface IUpdateAiPromptRequestDto {
  visibility?: AiPromptVisibilityDto;
  type?: AiPromptType;
  isDefault?: boolean;
  name?: string;
  description?: string;
  argumentHint?: string;
  version?: string;
  variables?: readonly IAiPromptVariable[];
  template?: AiPromptTemplate;
  metadata?: Record<string, unknown>;
}

export interface IDeleteAiPromptResponseDto {
  id: string;
  deleted: true;
}
