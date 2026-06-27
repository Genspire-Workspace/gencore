// file: packages/auth/src/application/contracts/auth-user.result.ts

export interface IAuthUserResult {
  id: string;
  email: string;
  displayName?: string | null;
  emailConfirmed: boolean;
  state: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}