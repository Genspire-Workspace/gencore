// file: apps\playground-angular\src\app\features\auth\auth-api.client.ts

import { Injectable } from '@angular/core';
import { appEnv } from '../../core/app-env';
import type {
  IAuthLoginRequest,
  IAuthLogoutRequest,
  IAuthRefreshRequest,
  IAuthRegisterRequest,
  IAuthResponse,
} from '@genspire/sdk-auth';
import { FetchAuthClient } from '@genspire/sdk-auth';

@Injectable({ providedIn: 'root' })
export class AuthApiClient {
  private readonly client = new FetchAuthClient({
    baseUrl: appEnv.apiBaseUrl,
  });

  async login(input: IAuthLoginRequest): Promise<IAuthResponse> {
    return await this.client.login(input);
  }

  async register(input: IAuthRegisterRequest): Promise<IAuthResponse> {
    return await this.client.register(input);
  }

  async refresh(input: IAuthRefreshRequest): Promise<IAuthResponse> {
    return await this.client.refresh(input);
  }

  async logout(input: IAuthLogoutRequest): Promise<void> {
    await this.client.logout(input);
  }
}
