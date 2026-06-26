export interface IAuthUser {
  id: string;
  email: string;
  displayName?: string | null;
  emailConfirmed: boolean;
  state: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface IAuthResponse {
  user: IAuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface IStoredAuthState extends IAuthResponse {
  expiresAt: number;
}
