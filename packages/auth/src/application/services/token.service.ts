// file: packages/auth/src/application/services/token.service.ts

import { Singleton } from "@genspire/core";
import { SignJWT } from "jose";
import type { AuthUserBase } from "../../domain/entities/auth-user.entity.js";
import type { AuthPrincipal } from "../../domain/types/auth-principal.js";
import { AuthConfiguration } from "./auth-configuration.js";

export interface IAuthTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
}

@Singleton()
export class TokenService {
  static inject = [AuthConfiguration];

  constructor(private readonly config: AuthConfiguration) {}

  async createAccessToken(user: AuthUserBase): Promise<string> {
    const secret = new TextEncoder().encode(this.config.options.jwtSecret);
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + this.config.options.accessTokenTtlSeconds;

    const jwt = await new SignJWT({
      sub: user.id,
      email: user.email,
      typ: "access",
    } satisfies AuthPrincipal)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now)
      .setExpirationTime(expiresAt)
      .setIssuer(this.config.options.issuer)
      .setAudience(this.config.options.audience)
      .sign(secret);

    return jwt;
  }

  createRefreshToken(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(48));
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async hashRefreshToken(token: string): Promise<string> {
    const data = new TextEncoder().encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  getAccessTokenTtlSeconds(): number {
    return this.config.options.accessTokenTtlSeconds;
  }
}
