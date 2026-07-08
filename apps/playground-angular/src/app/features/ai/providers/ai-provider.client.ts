import { Injectable, inject } from '@angular/core';
import {
  FetchAiHttpTransport,
  FetchAiProviderClient,
} from '@genspire/sdk-ai';
import type {
  IAiApiKeyListResponseDto,
  IAiApiKeyResponseDto,
  IAiModelListResponseDto,
  IAiModelResponseDto,
  IAiProviderClientKindListResponseDto,
  IAiProviderListResponseDto,
  IAiProviderResponseDto,
  ICreateAiApiKeyRequestDto,
  ICreateAiModelRequestDto,
  ICreateAiProviderRequestDto,
  IDeleteAiProviderResponseDto,
  IUpdateAiApiKeyRequestDto,
  IUpdateAiModelRequestDto,
  IUpdateAiProviderRequestDto,
} from '@genspire/sdk-ai';
import { appEnv } from '../../../core/app-env';
import { AuthService } from '../../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class AiProviderClient {
  private readonly authService = inject(AuthService);
  private readonly transport = new FetchAiHttpTransport({
    baseUrl: appEnv.apiBaseUrl,
    getAccessToken: () => this.authService.ensureValidAccessToken(),
  });
  private readonly client = new FetchAiProviderClient(this.transport);

  async listProviders(): Promise<IAiProviderResponseDto[]> {
    const response: IAiProviderListResponseDto = await this.client.listProviders();
    return response.items;
  }

  async listClientKinds(): Promise<string[]> {
    const response: IAiProviderClientKindListResponseDto = await this.client.listClientKinds();
    return response.items.map((item) => item.id);
  }

  async createProvider(input: ICreateAiProviderRequestDto): Promise<IAiProviderResponseDto> {
    return await this.client.createProvider(input);
  }

  async updateProvider(
    providerId: string,
    input: IUpdateAiProviderRequestDto,
  ): Promise<IAiProviderResponseDto> {
    return await this.client.updateProvider(providerId, input);
  }

  async deleteProvider(providerId: string): Promise<IDeleteAiProviderResponseDto> {
    return await this.client.deleteProvider(providerId);
  }

  async listModels(providerId: string): Promise<IAiModelResponseDto[]> {
    const response: IAiModelListResponseDto = await this.client.listModels(providerId);
    return response.items;
  }

  async createModel(
    providerId: string,
    input: ICreateAiModelRequestDto,
  ): Promise<IAiModelResponseDto> {
    return await this.client.createModel(providerId, input);
  }

  async updateModel(
    providerId: string,
    modelId: string,
    input: IUpdateAiModelRequestDto,
  ): Promise<IAiModelResponseDto> {
    return await this.client.updateModel(providerId, modelId, input);
  }

  async deleteModel(providerId: string, modelId: string): Promise<IDeleteAiProviderResponseDto> {
    return await this.client.deleteModel(providerId, modelId);
  }

  async listApiKeys(providerId: string): Promise<IAiApiKeyResponseDto[]> {
    const response: IAiApiKeyListResponseDto = await this.client.listApiKeys(providerId);
    return response.items;
  }

  async createApiKey(
    providerId: string,
    input: ICreateAiApiKeyRequestDto,
  ): Promise<IAiApiKeyResponseDto> {
    return await this.client.createApiKey(providerId, input);
  }

  async updateApiKey(
    providerId: string,
    keyId: string,
    input: IUpdateAiApiKeyRequestDto,
  ): Promise<IAiApiKeyResponseDto> {
    return await this.client.updateApiKey(providerId, keyId, input);
  }
}
