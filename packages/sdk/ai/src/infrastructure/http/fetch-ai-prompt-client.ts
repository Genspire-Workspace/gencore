import type {
  ICreateAiPromptRequestDto,
  IDeleteAiPromptResponseDto,
  IAiPromptListResponseDto,
  IAiPromptResponseDto,
  IUpdateAiPromptRequestDto,
} from "../../domain/types/ai-prompt-sdk-types.js";
import type { IAiPromptTransport } from "../../application/contracts/ai-prompt-transport.js";
import {
  FetchAiHttpTransport,
  type IFetchAiHttpTransportOptions,
} from "./fetch-ai-http-transport.js";

const AI_PROMPT_API_PATH = "/api/v1/ai/prompts";

export interface IFetchAiPromptClientOptions extends IFetchAiHttpTransportOptions {}

export class FetchAiPromptClient implements IAiPromptTransport {
  private readonly transport: FetchAiHttpTransport;

  constructor(options: IFetchAiPromptClientOptions | FetchAiHttpTransport) {
    this.transport =
      options instanceof FetchAiHttpTransport
        ? options
        : new FetchAiHttpTransport(options);
  }

  async listPrompts(): Promise<IAiPromptListResponseDto> {
    return await this.transport.get<IAiPromptListResponseDto>(AI_PROMPT_API_PATH);
  }

  async createPrompt(input: ICreateAiPromptRequestDto): Promise<IAiPromptResponseDto> {
    return await this.transport.post<IAiPromptResponseDto>(AI_PROMPT_API_PATH, input);
  }

  async getPrompt(promptId: string): Promise<IAiPromptResponseDto> {
    return await this.transport.get<IAiPromptResponseDto>(`${AI_PROMPT_API_PATH}/${promptId}`);
  }

  async updatePrompt(
    promptId: string,
    input: IUpdateAiPromptRequestDto,
  ): Promise<IAiPromptResponseDto> {
    return await this.transport.patch<IAiPromptResponseDto>(
      `${AI_PROMPT_API_PATH}/${promptId}`,
      input,
    );
  }

  async deletePrompt(promptId: string): Promise<IDeleteAiPromptResponseDto> {
    return await this.transport.delete<IDeleteAiPromptResponseDto>(
      `${AI_PROMPT_API_PATH}/${promptId}`,
    );
  }
}
