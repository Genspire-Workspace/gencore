// file: packages/auth/src/application/contracts/logout.input.ts

import type { IAuthRequestMetadata } from "./auth-request-metadata.js";

export interface ILogoutInput {
  refreshToken?: string | null;
  metadata?: IAuthRequestMetadata;
}