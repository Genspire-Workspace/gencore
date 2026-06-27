// file: packages/auth/src/domain/index.ts

export { AuthUserBase, AuthUserEntity } from "./entities/auth-user.entity.js";
export { AuthRefreshTokenEntity } from "./entities/auth-refresh-token.entity.js";
export { AuthRoleEntity } from "./entities/auth-role.entity.js";
export { AuthUserRoleEntity } from "./entities/auth-user-role.entity.js";
export { AuthEventEntity } from "./entities/auth-event.entity.js";
export { AuthBannedIpEntity } from "./entities/auth-banned-ip.entity.js";
export { AuthUserIpEntity } from "./entities/auth-user-ip.entity.js";

export {
  AUTH_USER_REGISTERED_EVENT,
  type IAuthUserRegisteredEventPayload,
  type AuthDomainEventName,
} from "./events/auth-events.js";

export type { AuthEventType } from "./types/auth-event-types.js";
export type { AuthPrincipal } from "./types/auth-principal.js";
export type { AuthUserState } from "./types/auth-user-state.js";
export { CURRENT_USER_KEY } from "./types/current-user.js";
export type { ICurrentUser } from "./types/current-user.js";
