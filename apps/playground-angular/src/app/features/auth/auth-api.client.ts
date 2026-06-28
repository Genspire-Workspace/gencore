// file: apps\playground-angular\src\app\features\auth\auth-api.client.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { appEnv } from '../../core/app-env';
import type {
  IAuthResponseDto,
  ILoginRequestDto,
  ILogoutRequestDto,
  IRefreshRequestDto,
  IRegisterRequestDto,
} from '@genspire/auth/server/contracts';

@Injectable({ providedIn: 'root' })
export class AuthApiClient {
  private readonly http = inject(HttpClient);

  async login(input: ILoginRequestDto): Promise<IAuthResponseDto> {
    return await firstValueFrom(
      this.http.post<IAuthResponseDto>(`${appEnv.apiBaseUrl}/login`, input),
    );
  }

  async register(input: IRegisterRequestDto): Promise<IAuthResponseDto> {
    return await firstValueFrom(
      this.http.post<IAuthResponseDto>(`${appEnv.apiBaseUrl}/register`, input),
    );
  }

  async refresh(input: IRefreshRequestDto): Promise<IAuthResponseDto> {
    return await firstValueFrom(
      this.http.post<IAuthResponseDto>(`${appEnv.apiBaseUrl}/refresh`, input),
    );
  }

  async logout(input: ILogoutRequestDto): Promise<void> {
    await firstValueFrom(this.http.post(`${appEnv.apiBaseUrl}/logout`, input));
  }
}
