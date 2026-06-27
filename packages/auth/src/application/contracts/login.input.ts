// file: packages/auth/src/application/contracts/login.input.ts

import type { IAuthRequestMetadata } from "./auth-request-metadata.js";

export interface ILoginInput {
  email: string;
  password: string;
  metadata?: IAuthRequestMetadata;
}