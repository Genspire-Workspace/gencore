import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Server } from "@genspire/server";
import { createPlaygroundApp } from "../playground-api/src/playground-app.js";

async function registerAndGetToken(
  server: Server,
  email = `session-test-${crypto.randomUUID()}@example.com`,
  password = "password123",
): Promise<{ accessToken: string; userId: string; email: string }> {
  const res = await server.handle(
    new Request("http://localhost/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  );
  const body = await res.json() as Record<string, unknown>;
  return {
    accessToken: body.accessToken as string,
    userId: (body.user as Record<string, unknown>).id as string,
    email,
  };
}

function authHeaders(token: string): Record<string, string> {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  };
}

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
        (error as { code: string }).code === "EBUSY"
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

interface IAiSessionResponse {
  id: string;
  userId: string;
  title: string | null;
  provider: string | null;
  model: string | null;
  systemPrompt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface IAiSessionListResponse {
  items: IAiSessionResponse[];
}

interface IAiSessionMessageListResponse {
  items: Array<{
    id: string;
    sessionId: string;
    role: "system" | "user" | "assistant" | "tool";
    content: unknown;
    createdAt: string;
  }>;
}

async function createSession(
  server: Server,
  token: string,
  input: Record<string, unknown>,
): Promise<IAiSessionResponse> {
  const res = await server.handle(
    new Request("http://localhost/ai/sessions", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(input),
    }),
  );
  expect(res.status).toBe(201);
  return await res.json() as IAiSessionResponse;
}

async function listSessions(
  server: Server,
  token: string,
): Promise<IAiSessionListResponse> {
  const res = await server.handle(
    new Request("http://localhost/ai/sessions", {
      headers: { authorization: `Bearer ${token}` },
    }),
  );
  expect(res.status).toBe(200);
  return await res.json() as IAiSessionListResponse;
}

async function getSession(
  server: Server,
  token: string,
  id: string,
): Promise<Response> {
  return await server.handle(
    new Request(`http://localhost/ai/sessions/${id}`, {
      headers: { authorization: `Bearer ${token}` },
    }),
  );
}

async function updateSession(
  server: Server,
  token: string,
  id: string,
  input: Record<string, unknown>,
): Promise<IAiSessionResponse> {
  const res = await server.handle(
    new Request(`http://localhost/ai/sessions/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(input),
    }),
  );
  expect(res.status).toBe(200);
  return await res.json() as IAiSessionResponse;
}

async function deleteSession(
  server: Server,
  token: string,
  id: string,
): Promise<{ deleted: boolean }> {
  const res = await server.handle(
    new Request(`http://localhost/ai/sessions/${id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    }),
  );
  expect(res.status).toBe(200);
  return await res.json() as { deleted: boolean };
}

async function listMessages(
  server: Server,
  token: string,
  sessionId: string,
): Promise<IAiSessionMessageListResponse> {
  const res = await server.handle(
    new Request(`http://localhost/ai/sessions/${sessionId}/messages`, {
      headers: { authorization: `Bearer ${token}` },
    }),
  );
  expect(res.status).toBe(200);
  return await res.json() as IAiSessionMessageListResponse;
}

describe("playground ai sessions", () => {
  let tempDir = "";
  let dbPath = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "gencore-ai-sessions-"));
    dbPath = path.join(tempDir, "ai-sessions-test.db");
  });

  afterEach(async () => {
    if (tempDir) {
      await cleanupDirectory(tempDir);
    }
  });

  test("session CRUD persists and deletes sessions for the current user", async () => {
    const app = await createPlaygroundApp({
      port: 0,
      env: {
        ...process.env,
        GENCORE_PLAYGROUND_LIBSQL_DB_PATH: dbPath,
      },
    });

    await app.start();

    try {
      const server = app.get(Server);
      const { accessToken, userId } = await registerAndGetToken(server);

      const created = await createSession(server, accessToken, {
        title: "Test Session",
        systemPrompt: "You are concise.",
        metadata: { source: "test" },
      });

      expect(created.id).toBeDefined();
      expect(created.userId).toBe(userId);
      expect(created.title).toBe("Test Session");
      expect(created.systemPrompt).toBe("You are concise.");
      expect(created.metadata).toEqual({ source: "test" });

      const fetched = await getSession(server, accessToken, created.id);
      expect(fetched.status).toBe(200);
      expect((await fetched.json() as IAiSessionResponse).id).toBe(created.id);

      const updated = await updateSession(server, accessToken, created.id, {
        title: "Updated Session",
        provider: "ollama",
      });
      expect(updated.title).toBe("Updated Session");
      expect(updated.provider).toBe("ollama");

      const listed = await listSessions(server, accessToken);
      expect(listed.items.some((session) => session.id === created.id)).toBe(true);

      const deleted = await deleteSession(server, accessToken, created.id);
      expect(deleted.deleted).toBe(true);

      const missing = await getSession(server, accessToken, created.id);
      expect(missing.status).toBe(404);
    } finally {
      await app.stop();
    }
  });

  test("sessions are isolated per user (ownership enforced)", async () => {
    const app = await createPlaygroundApp({
      port: 0,
      env: {
        ...process.env,
        GENCORE_PLAYGROUND_LIBSQL_DB_PATH: dbPath,
      },
    });

    await app.start();

    try {
      const server = app.get(Server);
      const owner = await registerAndGetToken(server);
      const other = await registerAndGetToken(server);

      const session = await createSession(server, owner.accessToken, {
        title: "Owner Session",
      });

      const foreignGet = await server.handle(
        new Request(`http://localhost/ai/sessions/${session.id}`, {
          headers: { authorization: `Bearer ${other.accessToken}` },
        }),
      );
      expect(foreignGet.status).toBe(404);

      const foreignPatch = await server.handle(
        new Request(`http://localhost/ai/sessions/${session.id}`, {
          method: "PATCH",
          headers: authHeaders(other.accessToken),
          body: JSON.stringify({ title: "Hijacked" }),
        }),
      );
      expect(foreignPatch.status).toBe(404);

      const foreignDelete = await server.handle(
        new Request(`http://localhost/ai/sessions/${session.id}`, {
          method: "DELETE",
          headers: { authorization: `Bearer ${other.accessToken}` },
        }),
      );
      expect(foreignDelete.status).toBe(404);

      const ownerListed = await listSessions(server, owner.accessToken);
      expect(ownerListed.items.some((s) => s.id === session.id)).toBe(true);

      const otherListed = await listSessions(server, other.accessToken);
      expect(otherListed.items.some((s) => s.id === session.id)).toBe(false);
    } finally {
      await app.stop();
    }
  });

  test("new session starts with an empty message history", async () => {
    const app = await createPlaygroundApp({
      port: 0,
      env: {
        ...process.env,
        GENCORE_PLAYGROUND_LIBSQL_DB_PATH: dbPath,
      },
    });

    await app.start();

    try {
      const server = app.get(Server);
      const { accessToken } = await registerAndGetToken(server);

      const session = await createSession(server, accessToken, {
        title: "Empty History Session",
      });

      const messages = await listMessages(server, accessToken, session.id);
      expect(messages.items).toHaveLength(0);
    } finally {
      await app.stop();
    }
  });

  test("deleting a session cascades to its messages", async () => {
    const app = await createPlaygroundApp({
      port: 0,
      env: {
        ...process.env,
        GENCORE_PLAYGROUND_LIBSQL_DB_PATH: dbPath,
      },
    });

    await app.start();

    try {
      const server = app.get(Server);
      const { accessToken } = await registerAndGetToken(server);

      const session = await createSession(server, accessToken, {
        title: "Cascade Session",
      });

      const messagesRes = await server.handle(
        new Request(`http://localhost/ai/sessions/${session.id}/messages`, {
          method: "POST",
          headers: authHeaders(accessToken),
          body: JSON.stringify({
            content: "Hello",
            provider: "missing-provider",
            model: "missing-model",
          }),
        }),
      );

      expect(messagesRes.status).toBe(500);

      await deleteSession(server, accessToken, session.id);

      const deletedMessages = await server.handle(
        new Request(`http://localhost/ai/sessions/${session.id}/messages`, {
          headers: { authorization: `Bearer ${accessToken}` },
        }),
      );
      expect(deletedMessages.status).toBe(404);
    } finally {
      await app.stop();
    }
  });

  test("session endpoints require authentication", async () => {
    const app = await createPlaygroundApp({
      port: 0,
      env: {
        ...process.env,
        GENCORE_PLAYGROUND_LIBSQL_DB_PATH: dbPath,
      },
    });

    await app.start();

    try {
      const server = app.get(Server);

      const listRes = await server.handle(
        new Request("http://localhost/ai/sessions"),
      );
      expect(listRes.status).toBe(401);

      const createRes = await server.handle(
        new Request("http://localhost/ai/sessions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: "No Auth" }),
        }),
      );
      expect(createRes.status).toBe(401);
    } finally {
      await app.stop();
    }
  });
});
