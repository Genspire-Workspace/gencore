// file: packages/auth/src/server/auth-request-metadata.ts

import type { RequestContext } from "@genspire/server";
import type { IAuthRequestMetadata } from "../application/contracts/auth-request-metadata.js";

export type { IAuthRequestMetadata };

export function getAuthRequestMetadata(ctx: RequestContext): IAuthRequestMetadata {
  return {
    ipAddress: ctx.clientIp ?? null,
    userAgent: ctx.header("user-agent") ?? null,
  };
}
