// file: packages\auth\src\services\auth.service.ts

import { Scoped, GenError } from "@genspire/core";
import { AuthDbContext } from "../context/auth-db-context.js";
import { PasswordHasher } from "../hashing/password-hasher.js";
import { TokenService } from "./token.service.js";
import { AuthConfiguration } from "./auth-configuration.js";
import { AuthEventService } from "./auth-event.service.js";
import type { RegisterRequestDto } from "../dtos/register-request.dto.js";
import type { LoginRequestDto } from "../dtos/login-request.dto.js";
import type { RefreshRequestDto } from "../dtos/refresh-request.dto.js";
import type { LogoutRequestDto } from "../dtos/logout-request.dto.js";
import type { AuthResponseDto } from "../dtos/auth-response.dto.js";
import type { AuthUserResponseDto } from "../dtos/auth-user.dto.js";
import { AuthRefreshTokenEntity } from "../entities/auth-refresh-token.entity.js";
import { AuthUserBase } from "../entities/auth-user.entity.js";
import { jwtVerify } from "jose";
import type { IAuthRequestMetadata } from "../types/auth-request-metadata.js";

@Scoped()
export class AuthService {
  static inject = [AuthDbContext, PasswordHasher, TokenService, AuthConfiguration, AuthEventService];

  constructor(
    private readonly db: AuthDbContext,
    private readonly hasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly config: AuthConfiguration,
    private readonly events: AuthEventService,
  ) {}

  async register(
    input: RegisterRequestDto,
    metadata?: IAuthRequestMetadata,
  ): Promise<AuthResponseDto> {
    const email = input.email.trim().toLowerCase();
    if (!email) {
      await this.recordEvent({ eventType: "register_failed", email, failureCode: "AUTH_VALIDATION_ERROR", metadata });
      throw new GenError("Email is required.", "AUTH_VALIDATION_ERROR");
    }

    if (!input.password || input.password.length < 8) {
      await this.recordEvent({ eventType: "register_failed", email, failureCode: "AUTH_VALIDATION_ERROR", metadata });
      throw new GenError("Password must be at least 8 characters.", "AUTH_VALIDATION_ERROR");
    }

    const existing = await this.db.users.findOne({ normalizedEmail: email } as Partial<AuthUserBase>);
    if (existing) {
      await this.recordEvent({ eventType: "register_failed", email, failureCode: "AUTH_VALIDATION_CONFLICT", metadata });
      throw new GenError("Email is already registered.", "AUTH_VALIDATION_CONFLICT");
    }

    const passwordHash = await this.hasher.hash(input.password);
    const UserCtor = this.config.options.userEntity as { new (): AuthUserBase };
    const user = new UserCtor();
    user.id = crypto.randomUUID();
    user.email = input.email.trim();
    user.normalizedEmail = email;
    user.passwordHash = passwordHash;
    user.displayName = input.displayName?.trim() || null;
    user.emailConfirmed = false;
    user.state = "active";
    user.createdAt = new Date();
    user.updatedAt = new Date();

    await this.db.users.add(user);
    await this.db.saveChanges();

    await this.recordEvent({ eventType: "register_success", userId: user.id, email: user.email, metadata });

    return await this.issueTokens(user, undefined, metadata);
  }

  async login(
    input: LoginRequestDto,
    metadata?: IAuthRequestMetadata,
  ): Promise<AuthResponseDto> {
    const email = input.email.trim().toLowerCase();
    if (!email) {
      await this.recordEvent({ eventType: "login_failed", email, failureCode: "AUTH_VALIDATION_ERROR", metadata });
      throw new GenError("Email is required.", "AUTH_VALIDATION_ERROR");
    }

    if (!input.password) {
      await this.recordEvent({ eventType: "login_failed", email, failureCode: "AUTH_VALIDATION_ERROR", metadata });
      throw new GenError("Password is required.", "AUTH_VALIDATION_ERROR");
    }

    const user = await this.db.users.findOne({
      normalizedEmail: email,
    } as Partial<AuthUserBase>);

    if (!user) {
      await this.recordEvent({ eventType: "login_failed", email, failureCode: "AUTH_INVALID_CREDENTIALS", metadata });
      throw new GenError("Invalid email or password.", "AUTH_INVALID_CREDENTIALS");
    }

    if (user.state === "banned") {
      await this.recordEvent({ eventType: "user_blocked", userId: user.id, email, failureCode: "AUTH_USER_BANNED", metadata });
    }

    if (user.state !== "active") {
      await this.recordEvent({ eventType: "login_failed", email, failureCode: "AUTH_VALIDATION_ACCOUNT_STATE", metadata });
      throw new GenError("Account is not active.", "AUTH_VALIDATION_ACCOUNT_STATE");
    }

    const valid = await this.hasher.verify(user.passwordHash, input.password);
    if (!valid) {
      await this.recordEvent({ eventType: "login_failed", email, failureCode: "AUTH_INVALID_CREDENTIALS", metadata });
      throw new GenError("Invalid email or password.", "AUTH_INVALID_CREDENTIALS");
    }

    user.lastLoginAt = new Date();
    await this.db.users.update(user);
    await this.db.saveChanges();

    await this.recordEvent({ eventType: "login_success", userId: user.id, email: user.email, metadata });

    return await this.issueTokens(user, undefined, metadata);
  }

  async refresh(
    input: RefreshRequestDto,
    metadata?: IAuthRequestMetadata,
  ): Promise<AuthResponseDto> {
    if (!input.refreshToken) {
      await this.recordEvent({ eventType: "refresh_failed", failureCode: "AUTH_VALIDATION_ERROR", metadata });
      throw new GenError("Refresh token is required.", "AUTH_VALIDATION_ERROR");
    }

    const tokenHash = await this.tokenService.hashRefreshToken(input.refreshToken);
    const storedToken = await this.db.refreshTokens.findOne({
      tokenHash,
    } as Partial<AuthRefreshTokenEntity>);

    if (!storedToken) {
      await this.recordEvent({ eventType: "refresh_failed", failureCode: "AUTH_INVALID_TOKEN", metadata });
      throw new GenError("Invalid refresh token.", "AUTH_INVALID_TOKEN");
    }

    if (storedToken.revokedAt) {
      await this.recordEvent({ eventType: "refresh_failed", failureCode: "AUTH_VALIDATION_TOKEN_REVOKED", metadata });
      throw new GenError("Refresh token has been revoked.", "AUTH_VALIDATION_TOKEN_REVOKED");
    }

    if (storedToken.expiresAt < new Date()) {
      await this.recordEvent({ eventType: "refresh_failed", failureCode: "AUTH_VALIDATION_TOKEN_EXPIRED", metadata });
      throw new GenError("Refresh token has expired.", "AUTH_VALIDATION_TOKEN_EXPIRED");
    }

    const user = await this.db.users.findById(storedToken.userId);
    if (!user) {
      await this.recordEvent({ eventType: "refresh_failed", failureCode: "AUTH_VALIDATION_USER_NOT_FOUND", metadata });
      throw new GenError("User not found.", "AUTH_VALIDATION_USER_NOT_FOUND");
    }

    if (user.state !== "active") {
      await this.recordEvent({ eventType: "refresh_failed", userId: user.id, failureCode: "AUTH_VALIDATION_ACCOUNT_STATE", metadata });
      throw new GenError("Account is not active.", "AUTH_VALIDATION_ACCOUNT_STATE");
    }

    storedToken.revokedAt = new Date();
    storedToken.revokedByIp = metadata?.ipAddress ?? null;
    await this.db.refreshTokens.update(storedToken);

    await this.recordEvent({ eventType: "refresh_success", userId: user.id, email: user.email, metadata });

    return await this.issueTokens(user, storedToken, metadata);
  }

  async logout(
    input: LogoutRequestDto,
    metadata?: IAuthRequestMetadata,
  ): Promise<{ loggedOut: boolean }> {
    if (!input.refreshToken) {
      return { loggedOut: true };
    }

    const tokenHash = await this.tokenService.hashRefreshToken(input.refreshToken);
    const storedToken = await this.db.refreshTokens.findOne({
      tokenHash,
    } as Partial<AuthRefreshTokenEntity>);

    if (!storedToken) {
      return { loggedOut: true };
    }

    if (!storedToken.revokedAt) {
      storedToken.revokedAt = new Date();
      storedToken.revokedByIp = metadata?.ipAddress ?? null;
      await this.db.refreshTokens.update(storedToken);
      await this.db.saveChanges();
    }

    if (storedToken.userId) {
      await this.recordEvent({ eventType: "logout", userId: storedToken.userId, metadata });
    }

    return { loggedOut: true };
  }

  async getCurrentUserFromAccessToken(
    accessToken: string,
    metadata?: IAuthRequestMetadata,
  ): Promise<AuthUserResponseDto | null> {
    if (!accessToken) {
      return null;
    }

    try {
      const secret = new TextEncoder().encode(this.config.options.jwtSecret);
      const { payload } = await jwtVerify(accessToken, secret, {
        issuer: this.config.options.issuer,
        audience: this.config.options.audience,
      });

      const userId = payload.sub;
      if (!userId) {
        return null;
      }

      const user = await this.db.users.findById(userId);
      if (!user || user.state !== "active") {
        return null;
      }

      await this.recordEvent({ eventType: "me_access", userId: user.id, email: user.email, metadata });

      return this.toUserResponse(user);
    } catch {
      return null;
    }
  }

  async getUserProfile(
    userId: string,
    metadata?: IAuthRequestMetadata,
  ): Promise<AuthUserResponseDto | null> {
    if (!userId) {
      return null;
    }

    const user = await this.db.users.findById(userId);
    if (!user || user.state !== "active") {
      return null;
    }

    await this.recordEvent({ eventType: "me_access", userId: user.id, email: user.email, metadata });

    return this.toUserResponse(user);
  }

  private async issueTokens(
    user: AuthUserBase,
    replacedToken?: AuthRefreshTokenEntity,
    metadata?: IAuthRequestMetadata,
  ): Promise<AuthResponseDto> {
    const accessToken = await this.tokenService.createAccessToken(user);
    const rawRefreshToken = this.tokenService.createRefreshToken();
    const refreshTokenHash = await this.tokenService.hashRefreshToken(rawRefreshToken);
    const expiresIn = this.tokenService.getAccessTokenTtlSeconds();

    const RefreshTokenCtor = this.config.options.refreshTokenEntity as { new (): AuthRefreshTokenEntity };
    const refreshTokenEntity = new RefreshTokenCtor();
    refreshTokenEntity.id = crypto.randomUUID();
    refreshTokenEntity.userId = user.id;
    refreshTokenEntity.tokenHash = refreshTokenHash;
    refreshTokenEntity.expiresAt = new Date(
      Date.now() + this.config.options.refreshTokenTtlSeconds * 1000,
    );
    refreshTokenEntity.createdAt = new Date();
    refreshTokenEntity.createdByIp = metadata?.ipAddress ?? null;
    refreshTokenEntity.userAgent = metadata?.userAgent ?? null;

    if (replacedToken) {
      refreshTokenEntity.replacedByTokenId = replacedToken.id;
    }

    await this.db.refreshTokens.add(refreshTokenEntity);

    if (replacedToken) {
      replacedToken.replacedByTokenId = refreshTokenEntity.id;
      replacedToken.revokedByIp = metadata?.ipAddress ?? null;
      await this.db.refreshTokens.update(replacedToken);
    }

    await this.db.saveChanges();

    return {
      user: this.toUserResponse(user),
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn,
      tokenType: "Bearer",
    };
  }

  private async recordEvent(input: {
    eventType: string;
    userId?: string | null;
    email?: string | null;
    failureCode?: string | null;
    metadata?: IAuthRequestMetadata;
  }): Promise<void> {
    try {
      await this.events.record({
        eventType: input.eventType as any,
        userId: input.userId ?? null,
        email: input.email ?? null,
        ipAddress: input.metadata?.ipAddress ?? null,
        userAgent: input.metadata?.userAgent ?? null,
        success: !input.failureCode,
        failureCode: input.failureCode ?? null,
      });
    } catch {
      // Event logging should not break auth flow
    }
  }

  private toUserResponse(user: AuthUserBase): AuthUserResponseDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      emailConfirmed: user.emailConfirmed,
      state: user.state,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    };
  }
}
