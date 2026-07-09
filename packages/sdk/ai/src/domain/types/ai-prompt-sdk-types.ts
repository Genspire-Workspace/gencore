import type {
  AiPromptTemplate,
  IAiPrompt,
  IAiPromptVariable,
} from "@genspire/ai/domain/prompts";

export type {
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

export interface ICreateAiPromptRequestDto {
  visibility?: AiPromptVisibilityDto;
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
