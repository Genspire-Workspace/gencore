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

export interface IAiProviderTransport {
  discoverProviders(): Promise<IAiProviderDiscoveryListResponseDto>;
  listClientKinds(): Promise<IAiProviderClientKindListResponseDto>;
  listProviders(): Promise<IAiProviderListResponseDto>;
  createProvider(input: ICreateAiProviderRequestDto): Promise<IAiProviderResponseDto>;
  getProvider(providerId: string): Promise<IAiProviderResponseDto>;
  updateProvider(providerId: string, input: IUpdateAiProviderRequestDto): Promise<IAiProviderResponseDto>;
  deleteProvider(providerId: string): Promise<IDeleteAiProviderResponseDto>;
  listModels(providerId: string): Promise<IAiModelListResponseDto>;
  createModel(providerId: string, input: ICreateAiModelRequestDto): Promise<IAiModelResponseDto>;
  getModel(providerId: string, modelId: string): Promise<IAiModelResponseDto>;
  updateModel(providerId: string, modelId: string, input: IUpdateAiModelRequestDto): Promise<IAiModelResponseDto>;
  deleteModel(providerId: string, modelId: string): Promise<IDeleteAiProviderResponseDto>;
  listApiKeys(providerId: string): Promise<IAiApiKeyListResponseDto>;
  createApiKey(providerId: string, input: ICreateAiApiKeyRequestDto): Promise<IAiApiKeyResponseDto>;
  updateApiKey(
    providerId: string,
    keyId: string,
    input: IUpdateAiApiKeyRequestDto,
  ): Promise<IAiApiKeyResponseDto>;
  deleteApiKey(providerId: string, keyId: string): Promise<IDeleteAiProviderResponseDto>;
}
