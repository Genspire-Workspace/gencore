import { Scoped, GenError } from "@genspire/core";
import { AuthDbContext } from "../context/auth-db-context.js";
import { PasswordHasher } from "../hashing/password-hasher.js";
import { TokenService } from "./token.service.js";
import { AuthConfiguration } from "./auth-configuration.js";
import type { RegisterRequestDto } from "../dtos/register-request.dto.js";
import type { LoginRequestDto } from "../dtos/login-request.dto.js";
import type { RefreshRequestDto } from "../dtos/refresh-request.dto.js";
import type { LogoutRequestDto } from "../dtos/logout-request.dto.js";
import type { AuthResponseDto } from "../dtos/auth-response.dto.js";
import type { AuthUserResponseDto } from "../dtos/auth-user.dto.js";
import { AuthRefreshTokenEntity } from "../entities/auth-refresh-token.entity.js";
import { AuthUserBase } from "../entities/auth-user.entity.js";
import { jwtVerify } from "jose";

@Scoped()
export class AuthService {
  static inject = [AuthDbContext, PasswordHasher, TokenService, AuthConfiguration];

  constructor(
    private readonly db: AuthDbContext,
    private readonly hasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly config: AuthConfiguration,
  ) {}

  async register(input: RegisterRequestDto): Promise<AuthResponseDto> {
    const email = input.email.trim().toLowerCase();
    if (!email) {
      throw new GenError("Email is required.", "AUTH_VALIDATION_ERROR");
    }

    if (!input.password || input.password.length < 8) {
      throw new GenError("Password must be at least 8 characters.", "AUTH_VALIDATION_ERROR");
    }

    const existing = await this.db.users.findOne({ normalizedEmail: email } as Partial<AuthUserBase>);
    if (existing) {
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

    return await this.issueTokens(user);
  }

  async login(input: LoginRequestDto): Promise<AuthResponseDto> {
    const email = input.email.trim().toLowerCase();
    if (!email) {
      throw new GenError("Email is required.", "AUTH_VALIDATION_ERROR");
    }

    if (!input.password) {
      throw new GenError("Password is required.", "AUTH_VALIDATION_ERROR");
    }

    const user = await this.db.users.findOne({
      normalizedEmail: email,
    } as Partial<AuthUserBase>);

    if (!user) {
      throw new GenError("Invalid email or password.", "AUTH_INVALID_CREDENTIALS");
    }

    if (user.state !== "active") {
      throw new GenError("Account is not active.", "AUTH_VALIDATION_ACCOUNT_STATE");
    }

    const valid = await this.hasher.verify(user.passwordHash, input.password);
    if (!valid) {
      throw new GenError("Invalid email or password.", "AUTH_INVALID_CREDENTIALS");
    }

    user.lastLoginAt = new Date();
    await this.db.users.update(user);
    await this.db.saveChanges();

    return await this.issueTokens(user);
  }

  async refresh(input: RefreshRequestDto): Promise<AuthResponseDto> {
    if (!input.refreshToken) {
      throw new GenError("Refresh token is required.", "AUTH_VALIDATION_ERROR");
    }

    const tokenHash = await this.tokenService.hashRefreshToken(input.refreshToken);
    const storedToken = await this.db.refreshTokens.findOne({
      tokenHash,
    } as Partial<AuthRefreshTokenEntity>);

    if (!storedToken) {
      throw new GenError("Invalid refresh token.", "AUTH_INVALID_TOKEN");
    }

    if (storedToken.revokedAt) {
      throw new GenError("Refresh token has been revoked.", "AUTH_VALIDATION_TOKEN_REVOKED");
    }

    if (storedToken.expiresAt < new Date()) {
      throw new GenError("Refresh token has expired.", "AUTH_VALIDATION_TOKEN_EXPIRED");
    }

    const user = await this.db.users.findById(storedToken.userId);
    if (!user) {
      throw new GenError("User not found.", "AUTH_VALIDATION_USER_NOT_FOUND");
    }

    storedToken.revokedAt = new Date();
    await this.db.refreshTokens.update(storedToken);

    return await this.issueTokens(user, storedToken);
  }

  async logout(input: LogoutRequestDto): Promise<{ loggedOut: boolean }> {
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
      await this.db.refreshTokens.update(storedToken);
      await this.db.saveChanges();
    }

    return { loggedOut: true };
  }

  async getCurrentUserFromAccessToken(
    accessToken: string,
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

      return this.toUserResponse(user);
    } catch {
      return null;
    }
  }

  private async issueTokens(
    user: AuthUserBase,
    replacedToken?: AuthRefreshTokenEntity,
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

    if (replacedToken) {
      refreshTokenEntity.replacedByTokenId = replacedToken.id;
    }

    await this.db.refreshTokens.add(refreshTokenEntity);

    if (replacedToken) {
      replacedToken.replacedByTokenId = refreshTokenEntity.id;
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
