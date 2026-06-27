// file: apps\playground-api\src\auth\auth.test.ts

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Server } from "@genspire/server";
import { EventBus } from "@genspire/core";
import { AuthUserIpService } from "@genspire/auth";
import { createPlaygroundApp } from "../playground-app.js";

async function cleanupDirectory(target: string): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await rm(target, { recursive: true, force: true });
      return;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "EBUSY"
      ) {
        if (attempt < 9) {
          await Bun.sleep(50);
          continue;
        }
        return;
      }
      throw error;
    }
  }
}

describe("playground auth api", () => {
  let tempDir = "";
  let dbPath = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "gencore-playground-auth-"));
    dbPath = path.join(tempDir, "playground-test.db");
  });

  afterEach(async () => {
    if (tempDir) {
      await cleanupDirectory(tempDir);
    }
  });

  async function createApp() {
    return await createPlaygroundApp({
      port: 0,
      env: {
        ...process.env,
        GENCORE_PLAYGROUND_LIBSQL_DB_PATH: dbPath,
      },
    });
  }

  test("POST /register creates a user and returns tokens", async () => {
    const app = await createApp();
    await app.start();

    try {
      const server = app.get(Server);
      const response = await server.handle(
        new Request("http://localhost/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: "alice@example.com",
            password: "password123",
            displayName: "Alice",
          }),
        }),
      );

      expect(response.status).toBe(201);
      const body = await response.json() as Record<string, unknown>;
      expect(body.user).toBeDefined();
      expect((body.user as Record<string, unknown>).email).toBe("alice@example.com");
      expect((body.user as Record<string, unknown>).displayName).toBe("Alice");
      expect(body.accessToken).toBeTruthy();
      expect(body.refreshToken).toBeTruthy();
      expect(body.tokenType).toBe("Bearer");
      expect(typeof body.expiresIn).toBe("number");
    } finally {
      await app.stop();
    }
  });

  test("POST /register rejects duplicate email", async () => {
    const app = await createApp();
    await app.start();

    try {
      const server = app.get(Server);
      await server.handle(
        new Request("http://localhost/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "dup@example.com", password: "password123" }),
        }),
      );

      const response2 = await server.handle(
        new Request("http://localhost/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "DUP@example.com", password: "password123" }),
        }),
      );

      expect(response2.status).toBe(400);
      const problem = await response2.json() as Record<string, unknown>;
      expect(problem.code).toBe("AUTH_VALIDATION_CONFLICT");
    } finally {
      await app.stop();
    }
  });

  test("POST /register rejects short password", async () => {
    const app = await createApp();
    await app.start();

    try {
      const server = app.get(Server);
      const response = await server.handle(
        new Request("http://localhost/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "short@example.com", password: "123" }),
        }),
      );

      expect(response.status).toBe(400);
      const problem = await response.json() as Record<string, unknown>;
      expect(problem.code).toBe("AUTH_VALIDATION_ERROR");
    } finally {
      await app.stop();
    }
  });

  test("POST /login returns tokens for valid credentials", async () => {
    const app = await createApp();
    await app.start();

    try {
      const server = app.get(Server);
      await server.handle(
        new Request("http://localhost/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "bob@example.com", password: "password123" }),
        }),
      );

      const loginResponse = await server.handle(
        new Request("http://localhost/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "bob@example.com", password: "password123" }),
        }),
      );

      expect(loginResponse.status).toBe(200);
      const body = await loginResponse.json() as Record<string, unknown>;
      expect(body.accessToken).toBeTruthy();
      expect(body.refreshToken).toBeTruthy();
      expect((body.user as Record<string, unknown>).email).toBe("bob@example.com");
    } finally {
      await app.stop();
    }
  });

  test("POST /login rejects wrong password", async () => {
    const app = await createApp();
    await app.start();

    try {
      const server = app.get(Server);
      await server.handle(
        new Request("http://localhost/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "wrong@example.com", password: "password123" }),
        }),
      );

      const loginResponse = await server.handle(
        new Request("http://localhost/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "wrong@example.com", password: "wrongpassword" }),
        }),
      );

      expect(loginResponse.status).toBe(400);
      const problem = await loginResponse.json() as Record<string, unknown>;
      expect(problem.code).toBe("AUTH_INVALID_CREDENTIALS");
    } finally {
      await app.stop();
    }
  });

  test("POST /refresh rotates the refresh token", async () => {
    const app = await createApp();
    await app.start();

    try {
      const server = app.get(Server);
      const registerResponse = await server.handle(
        new Request("http://localhost/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "refresh@example.com", password: "password123" }),
        }),
      );

      const registerBody = await registerResponse.json() as Record<string, unknown>;
      const originalRefreshToken = registerBody.refreshToken as string;

      const refreshResponse = await server.handle(
        new Request("http://localhost/refresh", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ refreshToken: originalRefreshToken }),
        }),
      );

      expect(refreshResponse.status).toBe(200);
      const refreshBody = await refreshResponse.json() as Record<string, unknown>;
      expect(refreshBody.accessToken).toBeTruthy();
      expect(refreshBody.refreshToken).toBeTruthy();
      expect(refreshBody.refreshToken).not.toBe(originalRefreshToken);
      expect((refreshBody.user as Record<string, unknown>).email).toBe("refresh@example.com");

      const reuseResponse = await server.handle(
        new Request("http://localhost/refresh", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ refreshToken: originalRefreshToken }),
        }),
      );

      expect(reuseResponse.status).toBe(400);
    } finally {
      await app.stop();
    }
  });

  test("POST /logout revokes the refresh token", async () => {
    const app = await createApp();
    await app.start();

    try {
      const server = app.get(Server);
      const registerResponse = await server.handle(
        new Request("http://localhost/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "logout@example.com", password: "password123" }),
        }),
      );

      const registerBody = await registerResponse.json() as Record<string, unknown>;
      const refreshToken = registerBody.refreshToken as string;

      const logoutResponse = await server.handle(
        new Request("http://localhost/logout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        }),
      );

      expect(logoutResponse.status).toBe(200);
      expect(await logoutResponse.json()).toEqual({ loggedOut: true });

      const refreshAfterLogout = await server.handle(
        new Request("http://localhost/refresh", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        }),
      );

      expect(refreshAfterLogout.status).toBe(400);
    } finally {
      await app.stop();
    }
  });

  test("GET /me returns current user with valid Bearer token", async () => {
    const app = await createApp();
    await app.start();

    try {
      const server = app.get(Server);
      const registerResponse = await server.handle(
        new Request("http://localhost/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "me@example.com", password: "password123" }),
        }),
      );

      const registerBody = await registerResponse.json() as Record<string, unknown>;
      const accessToken = registerBody.accessToken as string;

      const meResponse = await server.handle(
        new Request("http://localhost/me", {
          headers: { authorization: `Bearer ${accessToken}` },
        }),
      );

      expect(meResponse.status).toBe(200);
      const user = await meResponse.json() as Record<string, unknown>;
      expect(user.email).toBe("me@example.com");
    } finally {
      await app.stop();
    }
  });

  test("GET /me returns 401 without token", async () => {
    const app = await createApp();
    await app.start();

    try {
      const server = app.get(Server);
      const response = await server.handle(new Request("http://localhost/me"));
      expect(response.status).toBe(401);
    } finally {
      await app.stop();
    }
  });

  test("/swagger.json includes auth endpoints", async () => {
    const app = await createApp();
    await app.start();

    try {
      const server = app.get(Server);
      const swaggerResponse = await server.handle(
        new Request("http://localhost/swagger.json"),
      );

      expect(swaggerResponse.status).toBe(200);
      const swaggerDocument = await swaggerResponse.json() as {
        paths: Record<string, unknown>;
      };

      expect(swaggerDocument.paths["/register"]).toBeDefined();
      expect(swaggerDocument.paths["/login"]).toBeDefined();
      expect(swaggerDocument.paths["/refresh"]).toBeDefined();
      expect(swaggerDocument.paths["/logout"]).toBeDefined();
      expect(swaggerDocument.paths["/me"]).toBeDefined();
    } finally {
      await app.stop();
    }
  });

  test("register emits an auth.user.registered event", async () => {
    const app = await createApp();
    await app.start();

    let captured: { name: string; payload: unknown } | undefined;
    const bus = app.get(EventBus);
    const subscription = bus.on("auth.user.registered", (event) => {
      captured = { name: event.name, payload: event.payload };
    });

    try {
      const server = app.get(Server);
      const response = await server.handle(
        new Request("http://localhost/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: "event@example.com",
            password: "password123",
            displayName: "Event",
          }),
        }),
      );

      expect(response.status).toBe(201);
      const body = (await response.json()) as Record<string, unknown>;
      const userId = (body.user as Record<string, unknown>).id as string;

      expect(captured).toBeDefined();
      expect(captured!.name).toBe("auth.user.registered");
      const payload = captured!.payload as Record<string, unknown>;
      expect(payload.userId).toBe(userId);
      expect(payload.email).toBe("event@example.com");
      expect(payload.displayName).toBe("Event");
      expect(payload.emailConfirmed).toBe(false);
      expect(typeof payload.registeredAt).toBe("string");
    } finally {
      subscription.unsubscribe();
      await app.stop();
    }
  });

  test("register records the request IP as a known user IP", async () => {
    const app = await createApp();
    await app.start();

    try {
      const server = app.get(Server);
      const response = await server.handle(
        new Request("http://localhost/register", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "203.0.113.42",
          },
          body: JSON.stringify({ email: "ip@example.com", password: "password123" }),
        }),
      );

      expect(response.status).toBe(201);
      const body = (await response.json()) as Record<string, unknown>;
      const userId = (body.user as Record<string, unknown>).id as string;

      const scope = app.createScope();
      try {
        const userIpService = scope.resolve(AuthUserIpService);
        const knownIps = await userIpService.listForUser(userId);
        expect(knownIps.length).toBeGreaterThanOrEqual(1);
        expect(knownIps.some((entry) => entry.ipAddress === "203.0.113.42")).toBe(true);
      } finally {
        await scope.destroy();
      }
    } finally {
      await app.stop();
    }
  });
});
