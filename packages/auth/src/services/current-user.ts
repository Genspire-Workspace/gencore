// file: packages\auth\src\services\current-user.ts

import type { RequestContext } from "@genspire/server";
import { GenError } from "@genspire/core";
import { CURRENT_USER_KEY, type ICurrentUser } from "../types/current-user.js";

export function getCurrentUser(ctx: RequestContext): ICurrentUser | null {
  return ctx.items.get<ICurrentUser>(CURRENT_USER_KEY) ?? null;
}

export function requireCurrentUser(ctx: RequestContext): ICurrentUser {
  const user = getCurrentUser(ctx);
  if (!user) {
    throw new GenError("Current user is not available.", "AUTH_UNAUTHORIZED");
  }
  return user;
}
