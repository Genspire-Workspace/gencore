import type { RequestContext } from "@genspire/server";

export interface IAuthRequestMetadata {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export function getAuthRequestMetadata(ctx: RequestContext): IAuthRequestMetadata {
  return {
    ipAddress: ctx.clientIp ?? null,
    userAgent: ctx.header("user-agent") ?? null,
  };
}
