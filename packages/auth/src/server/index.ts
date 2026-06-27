// file: packages/auth/src/server/index.ts

export { AuthController } from "./controllers/auth.controller.js";
export { RoleController } from "./controllers/role.controller.js";

export { bearerAuthMiddleware } from "./middleware/bearer-auth.middleware.js";
export { authGuardMiddleware } from "./middleware/auth-guard.middleware.js";
export { ipBanMiddleware } from "./middleware/ip-ban.middleware.js";

export { getCurrentUser, requireCurrentUser } from "./current-user.js";
export { getAuthRequestMetadata } from "./auth-request-metadata.js";
export type { IAuthRequestMetadata } from "./auth-request-metadata.js";

export { RegisterRequestDto } from "./dtos/register-request.dto.js";
export { LoginRequestDto } from "./dtos/login-request.dto.js";
export { RefreshRequestDto } from "./dtos/refresh-request.dto.js";
export { LogoutRequestDto } from "./dtos/logout-request.dto.js";
export { AuthUserResponseDto } from "./dtos/auth-user.dto.js";
export { AuthResponseDto } from "./dtos/auth-response.dto.js";
export {
  RoleResponseDto,
  CreateRoleRequestDto,
  UpdateRoleRequestDto,
  AssignRoleRequestDto,
  UserRolesResponseDto,
} from "./dtos/role.dto.js";

export { authServerExtension, authServerMiddlewares } from "./auth-server-extension.js";
export type { IAuthServerExtensionOptions } from "./auth-server-extension.js";