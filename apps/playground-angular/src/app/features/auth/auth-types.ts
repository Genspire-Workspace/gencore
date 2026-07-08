// file: apps\playground-angular\src\app\features\auth\auth-types.ts

import type {
  IAuthResponse,
  IAuthUser,
} from '@genspire/sdk-auth';

export type { IAuthResponse, IAuthUser };

export interface IStoredAuthState extends IAuthResponse {
  expiresAt: number;
}
