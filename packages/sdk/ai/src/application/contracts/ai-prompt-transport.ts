import type {
  ICreateAiPromptRequestDto,
  IDeleteAiPromptResponseDto,
  IAiPromptListResponseDto,
  IAiPromptResponseDto,
  IUpdateAiPromptRequestDto,
} from "../../domain/types/ai-prompt-sdk-types.js";

export interface IAiPromptTransport {
  listPrompts(): Promise<IAiPromptListResponseDto>;
  createPrompt(input: ICreateAiPromptRequestDto): Promise<IAiPromptResponseDto>;
  getPrompt(promptId: string): Promise<IAiPromptResponseDto>;
  updatePrompt(
    promptId: string,
    input: IUpdateAiPromptRequestDto,
  ): Promise<IAiPromptResponseDto>;
  deletePrompt(promptId: string): Promise<IDeleteAiPromptResponseDto>;
}
