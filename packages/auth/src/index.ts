// file: packages/auth/src/index.ts

// Domain
export { AuthUserBase, AuthUserEntity } from "./domain/entities/auth-user.entity.js";
export { AuthRefreshTokenEntity } from "./domain/entities/auth-refresh-token.entity.js";
export { AuthRoleEntity } from "./domain/entities/auth-role.entity.js";
export { AuthUserRoleEntity } from "./domain/entities/auth-user-role.entity.js";
export { AuthEventEntity } from "./domain/entities/auth-event.entity.js";
export { AuthBannedIpEntity } from "./domain/entities/auth-banned-ip.entity.js";
export { AuthUserIpEntity } from "./domain/entities/auth-user-ip.entity.js";

export {
  AUTH_USER_REGISTERED_EVENT,
  type IAuthUserRegisteredEventPayload,
  type AuthDomainEventName,
} from "./domain/events/auth-events.js";

export type { AuthEventType } from "./domain/types/auth-event-types.js";
export type { AuthPrincipal } from "./domain/types/auth-principal.js";
export type { AuthUserState } from "./domain/types/auth-user-state.js";
export { CURRENT_USER_KEY } from "./domain/types/current-user.js";
export type { ICurrentUser } from "./domain/types/current-user.js";

// Application
export { AuthService } from "./application/services/auth.service.js";
export { AuthRoleService } from "./application/services/auth-role.service.js";
export { AuthEventService } from "./application/services/auth-event.service.js";
export { AuthBanService } from "./application/services/auth-ban.service.js";
export { AuthUserIpService } from "./application/services/auth-user-ip.service.js";
export type { IRecordKnownIpInput } from "./application/services/auth-user-ip.service.js";
export { TokenService } from "./application/services/token.service.js";
export { AuthConfiguration } from "./application/services/auth-configuration.js";

export { PasswordHasher } from "./application/hashing/password-hasher.js";
export { Argon2PasswordHasher } from "./application/hashing/argon2-password-hasher.js";

export { authExtension } from "./application/auth-extension.js";

export type { IAuthExtensionOptions as AuthExtensionOptions, RequiredAuthExtensionOptions } from "./application/contracts/auth-options.js";
export type { IAuthRequestMetadata } from "./application/contracts/auth-request-metadata.js";
export type { IRegisterInput } from "./application/contracts/register.input.js";
export type { ILoginInput } from "./application/contracts/login.input.js";
export type { IRefreshInput } from "./application/contracts/refresh.input.js";
export type { ILogoutInput } from "./application/contracts/logout.input.js";
export type { IAuthUserResult } from "./application/contracts/auth-user.result.js";
export type { IAuthSessionResult } from "./application/contracts/auth-session.result.js";

// Infrastructure
export { AuthDbContext } from "./infrastructure/persistence/auth-db-context.js";

// Server (re-exported for backward compatibility; prefer `@genspire/auth/server`)
export { AuthController } from "./server/controllers/auth.controller.js";
export { RoleController } from "./server/controllers/role.controller.js";
export { bearerAuthMiddleware } from "./server/middleware/bearer-auth.middleware.js";
export { authGuardMiddleware } from "./server/middleware/auth-guard.middleware.js";
export { ipBanMiddleware } from "./server/middleware/ip-ban.middleware.js";
export { getCurrentUser, requireCurrentUser } from "./server/current-user.js";
export { getAuthRequestMetadata } from "./server/auth-request-metadata.js";
export { authServerExtension, authServerMiddlewares } from "./server/auth-server-extension.js";
export type { IAuthServerExtensionOptions } from "./server/auth-server-extension.js";

export { RegisterRequestDto as RegisterRequest } from "./server/dtos/register-request.dto.js";
export { LoginRequestDto as LoginRequest } from "./server/dtos/login-request.dto.js";
export { RefreshRequestDto as RefreshRequest } from "./server/dtos/refresh-request.dto.js";
export { LogoutRequestDto as LogoutRequest } from "./server/dtos/logout-request.dto.js";
export { AuthUserResponseDto as AuthUserResponse } from "./server/dtos/auth-user.dto.js";
export { AuthResponseDto as AuthResponse } from "./server/dtos/auth-response.dto.js";
export {
  RoleResponseDto,
  CreateRoleRequestDto,
  UpdateRoleRequestDto,
  AssignRoleRequestDto,
  UserRolesResponseDto,
} from "./server/dtos/role.dto.js";
