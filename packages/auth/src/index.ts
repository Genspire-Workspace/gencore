// Entities
export { AuthUserBase, AuthUserEntity } from "./entities/auth-user.entity.js";
export { AuthRefreshTokenEntity } from "./entities/auth-refresh-token.entity.js";
export { AuthRoleEntity } from "./entities/auth-role.entity.js";
export { AuthUserRoleEntity } from "./entities/auth-user-role.entity.js";
export { AuthEventEntity } from "./entities/auth-event.entity.js";
export { AuthBannedIpEntity } from "./entities/auth-banned-ip.entity.js";

// Types
export type { IAuthExtensionOptions as AuthExtensionOptions, RequiredAuthExtensionOptions } from "./types/auth-options.js";
export type { AuthPrincipal } from "./types/auth-principal.js";
export type { ICurrentUser } from "./types/current-user.js";
export type { IAuthRequestMetadata } from "./types/auth-request-metadata.js";
export type { AuthEventType } from "./types/auth-event-types.js";
export type { AuthUserState } from "./types/auth-user-state.js";
export { getAuthRequestMetadata } from "./types/auth-request-metadata.js";

// DTOs
export { RegisterRequestDto as RegisterRequest } from "./dtos/register-request.dto.js";
export { LoginRequestDto as LoginRequest } from "./dtos/login-request.dto.js";
export { RefreshRequestDto as RefreshRequest } from "./dtos/refresh-request.dto.js";
export { LogoutRequestDto as LogoutRequest } from "./dtos/logout-request.dto.js";
export { AuthUserResponseDto as AuthUserResponse } from "./dtos/auth-user.dto.js";
export { AuthResponseDto as AuthResponse } from "./dtos/auth-response.dto.js";
export { RoleResponseDto } from "./dtos/role.dto.js";
export { CreateRoleRequestDto } from "./dtos/role.dto.js";
export { UpdateRoleRequestDto } from "./dtos/role.dto.js";
export { AssignRoleRequestDto } from "./dtos/role.dto.js";
export { UserRolesResponseDto } from "./dtos/role.dto.js";

// Services
export { AuthService } from "./services/auth.service.js";
export { AuthRoleService } from "./services/auth-role.service.js";
export { AuthEventService } from "./services/auth-event.service.js";
export { AuthBanService } from "./services/auth-ban.service.js";
export { TokenService } from "./services/token.service.js";
export { AuthConfiguration } from "./services/auth-configuration.js";

// Current user
export { getCurrentUser, requireCurrentUser } from "./services/current-user.js";

// Middleware
export { bearerAuthMiddleware } from "./middleware/bearer-auth.middleware.js";
export { authGuardMiddleware } from "./middleware/auth-guard.middleware.js";
export { ipBanMiddleware } from "./middleware/ip-ban.middleware.js";

// Hashing
export { PasswordHasher } from "./hashing/password-hasher.js";
export { Argon2PasswordHasher } from "./hashing/argon2-password-hasher.js";

// Context
export { AuthDbContext } from "./context/auth-db-context.js";

// Controller
export { AuthController } from "./controllers/auth.controller.js";
export { RoleController } from "./controllers/role.controller.js";

// Extension
export { authExtension } from "./extension/auth-extension.js";
