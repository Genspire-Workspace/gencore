// file: packages\auth\src\auth.test.ts

import { describe, expect, test } from "bun:test";
import { Argon2PasswordHasher } from "./hashing/argon2-password-hasher.js";
import { TokenService } from "./services/token.service.js";
import { AuthConfiguration } from "./services/auth-configuration.js";
import { AuthUserEntity } from "./entities/auth-user.entity.js";

describe("Password hasher", () => {
  test("hashes and verifies a password", async () => {
    const hasher = new Argon2PasswordHasher();
    const password = "test-password-123!";
    const hash = await hasher.hash(password);
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    expect(hash.startsWith("$argon2id$")).toBe(true);

    const valid = await hasher.verify(hash, password);
    expect(valid).toBe(true);

    const invalid = await hasher.verify(hash, "wrong-password");
    expect(invalid).toBe(false);
  });

  test("same password produces different hashes each time", async () => {
    const hasher = new Argon2PasswordHasher();
    const password = "same-password";
    const hash1 = await hasher.hash(password);
    const hash2 = await hasher.hash(password);
    expect(hash1).not.toBe(hash2);
  });
});

describe("Token service", () => {
  const config = new AuthConfiguration({
    jwtSecret: "test-secret-at-least-32-chars-long-for-hs256!!",
    issuer: "test-issuer",
    audience: "test-audience",
  });

  const service = new TokenService(config);

  test("creates a JWT access token", async () => {
    const user = new AuthUserEntity();
    user.id = crypto.randomUUID();
    user.email = "test@example.com";
    user.normalizedEmail = "test@example.com";

    const token = await service.createAccessToken(user);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  test("creates opaque refresh tokens", () => {
    const token1 = service.createRefreshToken();
    const token2 = service.createRefreshToken();
    expect(token1).toBeTruthy();
    expect(typeof token1).toBe("string");
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThan(32);
  });

  test("hashRefreshToken produces consistent hashes", async () => {
    const token = "some-refresh-token-value";
    const hash1 = await service.hashRefreshToken(token);
    const hash2 = await service.hashRefreshToken(token);
    expect(hash1).toBe(hash2);
  });
});
