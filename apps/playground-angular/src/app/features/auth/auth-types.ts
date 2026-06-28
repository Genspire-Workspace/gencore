// file: apps\playground-angular\src\app\features\auth\auth-types.ts

import type {
  IAuthResponseDto,
  IAuthUserResponseDto,
} from '@genspire/auth/server/contracts';

export type IAuthUser = IAuthUserResponseDto;
export type IAuthResponse = IAuthResponseDto;

export interface IStoredAuthState extends IAuthResponse {
  expiresAt: number;
}
