// file: packages/auth/src/application/contracts/refresh.input.ts

import type { IAuthRequestMetadata } from "./auth-request-metadata.js";

export interface IRefreshInput {
  refreshToken: string;
  metadata?: IAuthRequestMetadata;
}