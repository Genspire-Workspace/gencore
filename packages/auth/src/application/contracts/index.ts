// file: packages/auth/src/application/contracts/index.ts

export type { IAuthExtensionOptions, RequiredAuthExtensionOptions } from "./auth-options.js";
export { resolveAuthExtensionOptions } from "./auth-options.js";

export type { IAuthRequestMetadata } from "./auth-request-metadata.js";
export type { IRegisterInput } from "./register.input.js";
export type { ILoginInput } from "./login.input.js";
export type { IRefreshInput } from "./refresh.input.js";
export type { ILogoutInput } from "./logout.input.js";
export type { IAuthUserResult } from "./auth-user.result.js";
export type { IAuthSessionResult } from "./auth-session.result.js";