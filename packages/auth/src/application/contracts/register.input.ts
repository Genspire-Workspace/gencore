// file: packages/auth/src/application/contracts/register.input.ts

import type { IAuthRequestMetadata } from "./auth-request-metadata.js";

export interface IRegisterInput {
  email: string;
  password: string;
  displayName?: string | null;
  metadata?: IAuthRequestMetadata;
}