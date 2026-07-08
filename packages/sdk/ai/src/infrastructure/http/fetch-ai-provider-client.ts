import type {
  IAiApiKeyListResponseDto,
  IAiApiKeyResponseDto,
  IAiModelListResponseDto,
  IAiModelResponseDto,
  IAiProviderClientKindListResponseDto,
  IAiProviderDiscoveryListResponseDto,
  IAiProviderListResponseDto,
  IAiProviderResponseDto,
  ICreateAiApiKeyRequestDto,
  ICreateAiModelRequestDto,
  ICreateAiProviderRequestDto,
  IDeleteAiProviderResponseDto,
  IUpdateAiApiKeyRequestDto,
  IUpdateAiModelRequestDto,
  IUpdateAiProviderRequestDto,
} from "../../domain/types/ai-session-sdk-types.js";
import type { IAiProviderTransport } from "../../application/contracts/ai-provider-transport.js";
import {
  FetchAiHttpTransport,
  type IFetchAiHttpTransportOptions,
} from "./fetch-ai-http-transport.js";

const AI_PROVIDER_API_PATH = "/api/v1/ai/providers";

export interface IFetchAiProviderClientOptions extends IFetchAiHttpTransportOptions {}

export class FetchAiProviderClient implements IAiProviderTransport {
  private readonly transport: FetchAiHttpTransport;

  constructor(options: IFetchAiProviderClientOptions | FetchAiHttpTransport) {
    this.transport =
      options instanceof FetchAiHttpTransport
        ? options
        : new FetchAiHttpTransport(options);
  }

  async discoverProviders(): Promise<IAiProviderDiscoveryListResponseDto> {
    return await this.transport.get<IAiProviderDiscoveryListResponseDto>(
      `${AI_PROVIDER_API_PATH}/discover`,
    );
  }

  async listClientKinds(): Promise<IAiProviderClientKindListResponseDto> {
    return await this.transport.get<IAiProviderClientKindListResponseDto>(
      `${AI_PROVIDER_API_PATH}/client-kinds`,
    );
  }

  async listProviders(): Promise<IAiProviderListResponseDto> {
    return await this.transport.get<IAiProviderListResponseDto>(AI_PROVIDER_API_PATH);
  }

  async createProvider(input: ICreateAiProviderRequestDto): Promise<IAiProviderResponseDto> {
    return await this.transport.post<IAiProviderResponseDto>(AI_PROVIDER_API_PATH, input);
  }

  async getProvider(providerId: string): Promise<IAiProviderResponseDto> {
    return await this.transport.get<IAiProviderResponseDto>(`${AI_PROVIDER_API_PATH}/${providerId}`);
  }

  async updateProvider(
    providerId: string,
    input: IUpdateAiProviderRequestDto,
  ): Promise<IAiProviderResponseDto> {
    return await this.transport.patch<IAiProviderResponseDto>(
      `${AI_PROVIDER_API_PATH}/${providerId}`,
      input,
    );
  }

  async deleteProvider(providerId: string): Promise<IDeleteAiProviderResponseDto> {
    return await this.transport.delete<IDeleteAiProviderResponseDto>(
      `${AI_PROVIDER_API_PATH}/${providerId}`,
    );
  }

  async listModels(providerId: string): Promise<IAiModelListResponseDto> {
    return await this.transport.get<IAiModelListResponseDto>(
      `${AI_PROVIDER_API_PATH}/${providerId}/models`,
    );
  }

  async createModel(
    providerId: string,
    input: ICreateAiModelRequestDto,
  ): Promise<IAiModelResponseDto> {
    return await this.transport.post<IAiModelResponseDto>(
      `${AI_PROVIDER_API_PATH}/${providerId}/models`,
      input,
    );
  }

  async getModel(providerId: string, modelId: string): Promise<IAiModelResponseDto> {
    return await this.transport.get<IAiModelResponseDto>(
      `${AI_PROVIDER_API_PATH}/${providerId}/models/${modelId}`,
    );
  }

  async updateModel(
    providerId: string,
    modelId: string,
    input: IUpdateAiModelRequestDto,
  ): Promise<IAiModelResponseDto> {
    return await this.transport.patch<IAiModelResponseDto>(
      `${AI_PROVIDER_API_PATH}/${providerId}/models/${modelId}`,
      input,
    );
  }

  async deleteModel(providerId: string, modelId: string): Promise<IDeleteAiProviderResponseDto> {
    return await this.transport.delete<IDeleteAiProviderResponseDto>(
      `${AI_PROVIDER_API_PATH}/${providerId}/models/${modelId}`,
    );
  }

  async listApiKeys(providerId: string): Promise<IAiApiKeyListResponseDto> {
    return await this.transport.get<IAiApiKeyListResponseDto>(
      `${AI_PROVIDER_API_PATH}/${providerId}/api-keys`,
    );
  }

  async createApiKey(
    providerId: string,
    input: ICreateAiApiKeyRequestDto,
  ): Promise<IAiApiKeyResponseDto> {
    return await this.transport.post<IAiApiKeyResponseDto>(
      `${AI_PROVIDER_API_PATH}/${providerId}/api-keys`,
      input,
    );
  }

  async updateApiKey(
    providerId: string,
    keyId: string,
    input: IUpdateAiApiKeyRequestDto,
  ): Promise<IAiApiKeyResponseDto> {
    return await this.transport.patch<IAiApiKeyResponseDto>(
      `${AI_PROVIDER_API_PATH}/${providerId}/api-keys/${keyId}`,
      input,
    );
  }

  async deleteApiKey(providerId: string, keyId: string): Promise<IDeleteAiProviderResponseDto> {
    return await this.transport.delete<IDeleteAiProviderResponseDto>(
      `${AI_PROVIDER_API_PATH}/${providerId}/api-keys/${keyId}`,
    );
  }
}
