// file: packages/auth/src/application/contracts/auth-session.result.ts

import type { IAuthUserResult } from "./auth-user.result.js";

export interface IAuthSessionResult {
  user: IAuthUserResult;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
}