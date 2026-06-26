// file: apps\playground-api\src\playground-api.test.ts

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Server } from "@genspire/server";
import { AuthRoleService } from "@genspire/auth";
import { createPlaygroundApp } from "./playground-app.js";
import { aiPlaygroundRuntime } from "./ai/runtime/ai-service-factory.js";
import type { IChatGenerationRequest } from "../../../packages/ai/src/chat/chat-generation-request.js";
import type { IChatGenerationResponse } from "../../../packages/ai/src/chat/chat-generation-response.js";

async function registerAndGetToken(
  server: Server,
  email = `test-${crypto.randomUUID()}@example.com`,
  password = "password123",
): Promise<{ accessToken: string; userId: string }> {
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
  };
}

function authHeaders(token: string): Record<string, string> {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  };
}

function createTestEnv(
  dbPath: string,
  storageRoot = "./data/storage",
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GENCORE_PLAYGROUND_DATABASE_PROVIDER: "libsql",
    GENCORE_PLAYGROUND_LIBSQL_DB_PATH: dbPath,
    GENCORE_PLAYGROUND_STORAGE_PROVIDER: "local",
    GENCORE_PLAYGROUND_STORAGE_LOCAL_ROOT: storageRoot,
  };
}

function createAiResponse(
  request: IChatGenerationRequest,
  content: string,
): IChatGenerationResponse {
  return {
    id: crypto.randomUUID(),
    provider: request.provider ?? "ollama",
    model: request.model ?? "gemma4:12b",
    message: {
      role: "assistant",
      content,
    },
    finishReason: "stop",
  };
}

function getMessageText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (
        part &&
        typeof part === "object" &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string"
      ) {
        return part.text;
      }

      return "";
    })
    .join("");
}

async function createZipBlob(
  files: Record<string, string>,
): Promise<{ blob: Blob; name: string }> {
  const crcTable = (() => {
    const table = new Uint32Array(256);

    for (let index = 0; index < 256; index += 1) {
      let current = index;

      for (let bit = 0; bit < 8; bit += 1) {
        current = (current & 1) === 1
          ? 0xedb88320 ^ (current >>> 1)
          : current >>> 1;
      }

      table[index] = current >>> 0;
    }

    return table;
  })();
  const encoder = new TextEncoder();

  function crc32(bytes: Uint8Array): number {
    let current = 0xffffffff;

    for (const value of bytes) {
      current = crcTable[(current ^ value) & 0xff]! ^ (current >>> 8);
    }

    return (current ^ 0xffffffff) >>> 0;
  }

  function writeUInt16(target: Uint8Array, offset: number, value: number): void {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
  }

  function writeUInt32(target: Uint8Array, offset: number, value: number): void {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
    target[offset + 2] = (value >>> 16) & 0xff;
    target[offset + 3] = (value >>> 24) & 0xff;
  }

  interface IZipEntry {
    name: Uint8Array;
    body: Uint8Array;
    crc: number;
    localHeaderOffset: number;
  }

  const entries: IZipEntry[] = [];
  const localParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name.replaceAll("\\", "/"));
    const bodyBytes = encoder.encode(content);
    const header = new Uint8Array(30 + nameBytes.length);

    writeUInt32(header, 0, 0x04034b50);
    writeUInt16(header, 4, 20);
    writeUInt16(header, 6, 0);
    writeUInt16(header, 8, 0);
    writeUInt16(header, 10, 0);
    writeUInt16(header, 12, 0);
    writeUInt32(header, 14, crc32(bodyBytes));
    writeUInt32(header, 18, bodyBytes.length);
    writeUInt32(header, 22, bodyBytes.length);
    writeUInt16(header, 26, nameBytes.length);
    writeUInt16(header, 28, 0);
    header.set(nameBytes, 30);

    const entry: IZipEntry = {
      name: nameBytes,
      body: bodyBytes,
      crc: crc32(bodyBytes),
      localHeaderOffset: localOffset,
    };
    entries.push(entry);
    localParts.push(header, bodyBytes);
    localOffset += header.length + bodyBytes.length;
  }

  const centralParts: Uint8Array[] = [];
  let centralSize = 0;

  for (const entry of entries) {
    const header = new Uint8Array(46 + entry.name.length);

    writeUInt32(header, 0, 0x02014b50);
    writeUInt16(header, 4, 20);
    writeUInt16(header, 6, 20);
    writeUInt16(header, 8, 0);
    writeUInt16(header, 10, 0);
    writeUInt16(header, 12, 0);
    writeUInt16(header, 14, 0);
    writeUInt32(header, 16, entry.crc);
    writeUInt32(header, 20, entry.body.length);
    writeUInt32(header, 24, entry.body.length);
    writeUInt16(header, 28, entry.name.length);
    writeUInt16(header, 30, 0);
    writeUInt16(header, 32, 0);
    writeUInt16(header, 34, 0);
    writeUInt16(header, 36, 0);
    writeUInt32(header, 38, 0);
    writeUInt32(header, 42, entry.localHeaderOffset);
    header.set(entry.name, 46);

    centralParts.push(header);
    centralSize += header.length;
  }

  const endRecord = new Uint8Array(22);
  writeUInt32(endRecord, 0, 0x06054b50);
  writeUInt16(endRecord, 4, 0);
  writeUInt16(endRecord, 6, 0);
  writeUInt16(endRecord, 8, entries.length);
  writeUInt16(endRecord, 10, entries.length);
  writeUInt32(endRecord, 12, centralSize);
  writeUInt32(endRecord, 16, localOffset);
  writeUInt16(endRecord, 20, 0);

  return {
    blob: new Blob([...localParts, ...centralParts, endRecord], {
      type: "application/zip",
    }),
    name: "bundle.zip",
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

describe("playground api", () => {
  let tempDir = "";
  let dbPath = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "gencore-playground-"));
    dbPath = path.join(tempDir, "playground-test.db");
  });

  afterEach(async () => {
    if (tempDir) {
      await cleanupDirectory(tempDir);
    }
  });

  test("health route returns ok", async () => {
    const app = await createPlaygroundApp({
      port: 0,
      env: createTestEnv(dbPath),
    });

    await app.start();

    try {
      const response = await app.get(Server).handle(new Request("http://localhost/health"));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    } finally {
      await app.stop();
    }
  });

  test("ai providers route and swagger routes are registered", async () => {
    const app = await createPlaygroundApp({
      port: 0,
      env: createTestEnv(dbPath),
    });

    await app.start();

    try {
      const server = app.get(Server);
      const providersResponse = await server.handle(
        new Request("http://localhost/ai/providers"),
      );

      expect(providersResponse.status).toBe(200);
      const providersBody = await providersResponse.json() as {
        providers: Array<{ id: string; configured: boolean }>;
        defaults: Record<string, unknown>;
      };
      expect(providersBody.providers.some((provider) => provider.id === "ollama")).toBe(true);
      expect(providersBody.providers.some((provider) => provider.id === "deepseek")).toBe(true);
      expect(providersBody.defaults.chatProvider).toBeDefined();
      expect(providersBody.defaults.embeddingProvider).toBeDefined();
      expect(
        providersBody.providers.find((provider) => provider.id === "ollama"),
      ).toMatchObject({
        configured: true,
      });

      const swaggerResponse = await server.handle(
        new Request("http://localhost/swagger.json"),
      );
      expect(swaggerResponse.status).toBe(200);
      const swaggerDocument = await swaggerResponse.json() as {
        paths: Record<string, unknown>;
      };

      expect(swaggerDocument.paths["/ai/providers"]).toBeDefined();
      expect(swaggerDocument.paths["/ai/chat"]).toBeDefined();
      expect(swaggerDocument.paths["/ai/chat/stream"]).toBeDefined();
      expect(swaggerDocument.paths["/ai/embeddings"]).toBeDefined();
      expect(swaggerDocument.paths["/ai/prompts"]).toBeDefined();
      expect(swaggerDocument.paths["/ai/prompts/{id}"]).toBeDefined();
      expect(swaggerDocument.paths["/ai/prompts/{id}/render"]).toBeDefined();
      expect(swaggerDocument.paths["/ai/skills"]).toBeDefined();
      expect(swaggerDocument.paths["/ai/skills/import"]).toBeDefined();
      expect(swaggerDocument.paths["/ai/skills/{id}"]).toBeDefined();
      expect(swaggerDocument.paths["/ai/skills/{id}/download"]).toBeDefined();
    } finally {
      await app.stop();
    }
  });

  test("ai prompt CRUD supports array templates, rendering, and visibility filtering", async () => {
    const app = await createPlaygroundApp({
      port: 0,
      repoRoot: tempDir,
      env: createTestEnv(dbPath),
    });

    await app.start();

    try {
      const server = app.get(Server);
      const owner = await registerAndGetToken(server);
      const otherUser = await registerAndGetToken(server);

      const createResponse = await server.handle(
        new Request("http://localhost/ai/prompts", {
          method: "POST",
          headers: authHeaders(owner.accessToken),
          body: JSON.stringify({
            visibility: "shared",
            name: "Directory Prompt",
            description: "Reusable prompt for directory tasks",
            argumentHint: "<directory>",
            template: [
              {
                role: "system",
                content: "Focus on {{topic}} only.",
              },
              {
                role: "user",
                content: "Explain {{topic}} for {{audience}}.",
              },
            ],
            variables: [
              { name: "topic", required: true },
              { name: "audience", defaultValue: "operators" },
            ],
            metadata: {
              category: "playground",
            },
          }),
        }),
      );

      expect(createResponse.status).toBe(201);
      const createdPrompt = await createResponse.json() as {
        id: string;
        visibility: string;
        template: unknown;
      };
      expect(createdPrompt.visibility).toBe("shared");
      expect(Array.isArray(createdPrompt.template)).toBe(true);

      const renderResponse = await server.handle(
        new Request(`http://localhost/ai/prompts/${createdPrompt.id}/render`, {
          method: "POST",
          headers: authHeaders(owner.accessToken),
          body: JSON.stringify({
            variables: {
              topic: "databases",
              audience: "beginners",
            },
          }),
        }),
      );

      expect(renderResponse.status).toBe(200);
      const rendered = await renderResponse.json() as {
        messages: Array<{ role: string; content: unknown }>;
      };
      expect(rendered.messages).toHaveLength(2);
      expect(rendered.messages[0]?.role).toBe("system");
      expect(getMessageText(rendered.messages[0]?.content)).toContain("databases");
      expect(getMessageText(rendered.messages[1]?.content)).toContain("beginners");

      const listAsOtherUser = await server.handle(
        new Request("http://localhost/ai/prompts?visibility=shared", {
          headers: { authorization: `Bearer ${otherUser.accessToken}` },
        }),
      );
      expect(listAsOtherUser.status).toBe(200);
      const listedPrompts = await listAsOtherUser.json() as {
        items: Array<{ id: string }>;
      };
      expect(listedPrompts.items.some((item) => item.id === createdPrompt.id)).toBe(true);

      const patchResponse = await server.handle(
        new Request(`http://localhost/ai/prompts/${createdPrompt.id}`, {
          method: "PATCH",
          headers: authHeaders(owner.accessToken),
          body: JSON.stringify({
            description: "Updated description",
          }),
        }),
      );
      expect(patchResponse.status).toBe(200);
      expect(await patchResponse.json()).toMatchObject({
        id: createdPrompt.id,
        description: "Updated description",
      });

      const deleteResponse = await server.handle(
        new Request(`http://localhost/ai/prompts/${createdPrompt.id}`, {
          method: "DELETE",
          headers: { authorization: `Bearer ${owner.accessToken}` },
        }),
      );
      expect(deleteResponse.status).toBe(200);
      expect(await deleteResponse.json()).toEqual({ deleted: true });

      const invalidResponse = await server.handle(
        new Request("http://localhost/ai/prompts", {
          method: "POST",
          headers: authHeaders(owner.accessToken),
          body: JSON.stringify({
            visibility: "private",
            name: "Invalid Prompt",
            template: "Hello {{name}}",
            variables: [{ name: "   " }],
          }),
        }),
      );
      expect(invalidResponse.status).toBe(500);
    } finally {
      await app.stop();
    }
  });

  test("ai skill CRUD enforces execution boundaries and supports zip imports", async () => {
    const app = await createPlaygroundApp({
      port: 0,
      repoRoot: tempDir,
      env: createTestEnv(dbPath),
    });

    await app.start();

    try {
      const server = app.get(Server);
      const owner = await registerAndGetToken(server);
      const otherUser = await registerAndGetToken(server);

      const createResponse = await server.handle(
        new Request("http://localhost/ai/skills", {
          method: "POST",
          headers: authHeaders(owner.accessToken),
          body: JSON.stringify({
            visibility: "shared",
            name: "capital-helper",
            description: "Finds capitals with a trusted server tool.",
            instructions: "Always call the capital tool before answering.",
            executionMode: "server",
            allowedTools: ["get_capital"],
            serverToolNames: ["get_capital", "add_numbers"],
            prompts: [
              {
                name: "capital-template",
                template: "Look up the capital of {{country}}.",
                variables: [{ name: "country", required: true }],
              },
            ],
          }),
        }),
      );

      expect(createResponse.status).toBe(201);
      const createdSkill = await createResponse.json() as {
        id: string;
        manifest: {
          serverToolNames?: string[];
        };
      };
      expect(createdSkill.manifest.serverToolNames).toEqual([
        "get_capital",
        "add_numbers",
      ]);

      const getAsOtherUser = await server.handle(
        new Request(`http://localhost/ai/skills/${createdSkill.id}`, {
          headers: { authorization: `Bearer ${otherUser.accessToken}` },
        }),
      );
      expect(getAsOtherUser.status).toBe(200);

      const unregisterResponse = await server.handle(
        new Request(`http://localhost/ai/skills/${createdSkill.id}/unregister`, {
          method: "POST",
          headers: { authorization: `Bearer ${owner.accessToken}` },
        }),
      );
      expect(unregisterResponse.status).toBe(200);
      expect(await unregisterResponse.json()).toEqual({
        id: createdSkill.id,
        registered: false,
      });

      const registerResponse = await server.handle(
        new Request(`http://localhost/ai/skills/${createdSkill.id}/register`, {
          method: "POST",
          headers: { authorization: `Bearer ${owner.accessToken}` },
        }),
      );
      expect(registerResponse.status).toBe(200);
      expect(await registerResponse.json()).toEqual({
        id: createdSkill.id,
        registered: true,
      });

      const invalidClientSkillResponse = await server.handle(
        new Request("http://localhost/ai/skills", {
          method: "POST",
          headers: authHeaders(owner.accessToken),
          body: JSON.stringify({
            visibility: "private",
            name: "client-helper",
            description: "Should be rejected when binding server tools.",
            executionMode: "client",
            serverToolNames: ["get_capital"],
          }),
        }),
      );
      expect(invalidClientSkillResponse.status).toBe(400);

      const bundle = await createZipBlob({
        "SKILL.md": `---
name: imported-skill
description: Imported client skill bundle
---

# Imported Skill

Use this skill for imported bundle testing.`,
        "references/test.prompt.md": `---
description: Imported prompt
variables:
  - name: item
    required: true
---
Review {{item}}.`,
      });
      const formData = new FormData();
      formData.set("file", new File([bundle.blob], bundle.name, { type: "application/zip" }));
      formData.set("visibility", "shared");

      const importResponse = await server.handle(
        new Request("http://localhost/ai/skills/import", {
          method: "POST",
          headers: {
            authorization: `Bearer ${owner.accessToken}`,
          },
          body: formData,
        }),
      );
      expect(importResponse.status).toBe(201);
      const importedSkill = await importResponse.json() as {
        id: string;
        executionMode: string;
        bundleFormat: string;
        bundleStorageFileId?: string | null;
      };
      expect(importedSkill.executionMode).toBe("client");
      expect(importedSkill.bundleFormat).toBe("zip");
      expect(importedSkill.bundleStorageFileId).toBeTruthy();

      const downloadResponse = await server.handle(
        new Request(`http://localhost/ai/skills/${importedSkill.id}/download`, {
          headers: { authorization: `Bearer ${otherUser.accessToken}` },
        }),
      );
      expect(downloadResponse.status).toBe(200);
      expect(await downloadResponse.json()).toMatchObject({
        skillId: importedSkill.id,
        fileId: importedSkill.bundleStorageFileId,
        downloadPath: `/file/${importedSkill.bundleStorageFileId}`,
      });
    } finally {
      await app.stop();
    }
  });

  test("ai chat and session generation attach persisted prompts and skills at request time", async () => {
    const originalGenerateChatCompletion =
      aiPlaygroundRuntime.service.generateChatCompletion.bind(aiPlaygroundRuntime.service);
    const capturedRequests: IChatGenerationRequest[] = [];

    aiPlaygroundRuntime.service.generateChatCompletion = async (request) => {
      capturedRequests.push(request);
      return createAiResponse(request, "runtime ok");
    };

    const app = await createPlaygroundApp({
      port: 0,
      repoRoot: tempDir,
      env: createTestEnv(dbPath),
    });

    await app.start();

    try {
      const server = app.get(Server);
      const owner = await registerAndGetToken(server);

      const promptResponse = await server.handle(
        new Request("http://localhost/ai/prompts", {
          method: "POST",
          headers: authHeaders(owner.accessToken),
          body: JSON.stringify({
            visibility: "private",
            name: "Geo Prompt",
            template: [
              {
                role: "system",
                content: "Use the supplied context for {{country}}.",
              },
              {
                role: "user",
                content: "Prepare a quick answer for {{country}}.",
              },
            ],
            variables: [{ name: "country", required: true }],
          }),
        }),
      );
      expect(promptResponse.status).toBe(201);
      const prompt = await promptResponse.json() as { id: string };

      const serverSkillResponse = await server.handle(
        new Request("http://localhost/ai/skills", {
          method: "POST",
          headers: authHeaders(owner.accessToken),
          body: JSON.stringify({
            visibility: "private",
            name: "geo-skill",
            description: "Adds trusted tools and instructions.",
            instructions: "Skill instructions must be visible to the model.",
            executionMode: "server",
            allowedTools: ["get_capital"],
            serverToolNames: ["get_capital", "add_numbers"],
          }),
        }),
      );
      expect(serverSkillResponse.status).toBe(201);
      const serverSkill = await serverSkillResponse.json() as { id: string };

      const clientSkillResponse = await server.handle(
        new Request("http://localhost/ai/skills", {
          method: "POST",
          headers: authHeaders(owner.accessToken),
          body: JSON.stringify({
            visibility: "private",
            name: "client-docs",
            description: "Client-only instructions should not expose server tools.",
            instructions: "Client skill instructions are still model-visible.",
            executionMode: "client",
          }),
        }),
      );
      expect(clientSkillResponse.status).toBe(201);
      const clientSkill = await clientSkillResponse.json() as { id: string };

      const chatResponse = await server.handle(
        new Request("http://localhost/ai/chat", {
          method: "POST",
          headers: authHeaders(owner.accessToken),
          body: JSON.stringify({
            provider: "ollama",
            model: "gemma4:12b",
            systemPrompt: "Base system prompt.",
            promptIds: [prompt.id],
            skillIds: [serverSkill.id, clientSkill.id],
            promptVariables: {
              country: "Portugal",
            },
            messages: [
              {
                role: "user",
                content: "What should I know?",
              },
            ],
          }),
        }),
      );

      expect(chatResponse.status).toBe(200);
      expect(await chatResponse.json()).toMatchObject({
        message: {
          role: "assistant",
          content: "runtime ok",
        },
      });

      const directRequest = capturedRequests[0];
      expect(directRequest).toBeDefined();
      expect(directRequest?.tools?.map((tool) => tool.name)).toEqual([
        "get_capital",
      ]);
      expect(directRequest?.messages.map((message) => `${message.role}:${getMessageText(message.content)}`)).toEqual([
        "system:Base system prompt.",
        "system:Skill instructions must be visible to the model.",
        "system:Client skill instructions are still model-visible.",
        "system:Use the supplied context for Portugal.",
        "user:Prepare a quick answer for Portugal.",
        "user:What should I know?",
      ]);

      const sessionResponse = await server.handle(
        new Request("http://localhost/ai/sessions", {
          method: "POST",
          headers: authHeaders(owner.accessToken),
          body: JSON.stringify({
            title: "Prompt Attachment Session",
          }),
        }),
      );
      expect(sessionResponse.status).toBe(201);
      const session = await sessionResponse.json() as { id: string };

      const sessionMessageResponse = await server.handle(
        new Request(`http://localhost/ai/sessions/${session.id}/messages`, {
          method: "POST",
          headers: authHeaders(owner.accessToken),
          body: JSON.stringify({
            content: "Continue the request.",
            promptIds: [prompt.id],
            skillIds: [serverSkill.id],
            promptVariables: {
              country: "Japan",
            },
          }),
        }),
      );
      expect(sessionMessageResponse.status).toBe(200);

      const sessionRequest = capturedRequests[1];
      expect(sessionRequest).toBeDefined();
      expect(sessionRequest?.tools?.map((tool) => tool.name)).toEqual([
        "get_capital",
      ]);
      expect(sessionRequest?.messages.map((message) => `${message.role}:${getMessageText(message.content)}`)).toEqual([
        "system:Skill instructions must be visible to the model.",
        "system:Use the supplied context for Japan.",
        "user:Prepare a quick answer for Japan.",
        "user:Continue the request.",
      ]);

      const inaccessibleResponse = await server.handle(
        new Request("http://localhost/ai/chat", {
          method: "POST",
          headers: authHeaders(owner.accessToken),
          body: JSON.stringify({
            provider: "ollama",
            model: "gemma4:12b",
            promptIds: ["missing-prompt"],
            messages: [
              {
                role: "user",
                content: "Test missing prompt.",
              },
            ],
          }),
        }),
      );
      expect(inaccessibleResponse.status).toBe(404);
    } finally {
      aiPlaygroundRuntime.service.generateChatCompletion = originalGenerateChatCompletion;
      await app.stop();
    }
  });

  test("ai stream route returns NDJSON response headers", async () => {
    const app = await createPlaygroundApp({
      port: 0,
      env: createTestEnv(dbPath),
    });

    await app.start();

    try {
      const server = app.get(Server);
      const response = await server.handle(
        new Request("http://localhost/ai/chat/stream", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            provider: "missing-provider",
            model: "missing-model",
            messages: [
              {
                role: "user",
                content: "Hello",
              },
            ],
          }),
        }),
      );

      expect(response.headers.get("content-type")).toContain(
        "application/x-ndjson",
      );
      expect(response.headers.get("cache-control")).toBe("no-cache");
    } finally {
      await app.stop();
    }
  });

  test("ai session stream emits a terminal chunk when provider yields no chunks", async () => {
    const originalStreamChatCompletion =
      aiPlaygroundRuntime.service.streamChatCompletion.bind(aiPlaygroundRuntime.service);

    aiPlaygroundRuntime.service.streamChatCompletion = (async function* () {
      return;
    }) as typeof aiPlaygroundRuntime.service.streamChatCompletion;

    const app = await createPlaygroundApp({
      port: 0,
      env: createTestEnv(dbPath),
    });

    await app.start();

    try {
      const server = app.get(Server);
      const { accessToken } = await registerAndGetToken(server);

      const sessionResponse = await server.handle(
        new Request("http://localhost/ai/sessions", {
          method: "POST",
          headers: authHeaders(accessToken),
          body: JSON.stringify({
            title: "Stream Fallback Session",
          }),
        }),
      );

      expect(sessionResponse.status).toBe(201);
      const session = await sessionResponse.json() as { id: string };

      const streamResponse = await server.handle(
        new Request(`http://localhost/ai/sessions/${session.id}/messages/stream`, {
          method: "POST",
          headers: authHeaders(accessToken),
          body: JSON.stringify({
            content: "Hello",
            provider: "ollama",
            model: "gemma4:12b",
          }),
        }),
      );

      expect(streamResponse.status).toBe(200);
      expect(streamResponse.headers.get("content-type")).toContain("application/x-ndjson");

      const streamText = await streamResponse.text();
      const chunks = streamText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line)) as Array<Record<string, unknown>>;

      expect(chunks.length).toBe(1);
      expect(chunks[0]).toMatchObject({
        type: "message",
        sessionId: session.id,
      });
      expect(typeof chunks[0]?.userMessageId).toBe("string");
      expect(typeof chunks[0]?.assistantMessageId).toBe("string");

      const messagesResponse = await server.handle(
        new Request(`http://localhost/ai/sessions/${session.id}/messages`, {
          headers: { authorization: `Bearer ${accessToken}` },
        }),
      );
      expect(messagesResponse.status).toBe(200);

      const messages = await messagesResponse.json() as {
        items: Array<{ role: string }>;
      };
      expect(messages.items.map((message) => message.role)).toEqual([
        "user",
        "assistant",
      ]);
    } finally {
      aiPlaygroundRuntime.service.streamChatCompletion = originalStreamChatCompletion;
      await app.stop();
    }
  });

  test("ai chat rejects unknown server tool names before model execution", async () => {
    const app = await createPlaygroundApp({
      port: 0,
      env: createTestEnv(dbPath),
    });

    await app.start();

    try {
      const server = app.get(Server);
      const response = await server.handle(
        new Request("http://localhost/ai/chat", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            provider: "ollama",
            model: "gemma4:12b",
            messages: [
              {
                role: "user",
                content: "Hello",
              },
            ],
            tools: [
              {
                name: "missing_server_tool",
                description: "Missing server tool",
                executionMode: "server",
              },
            ],
          }),
        }),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        title: "Unknown server AI tool 'missing_server_tool'.",
        status: 400,
        code: "AI_SERVER_TOOL_NOT_FOUND",
      });
    } finally {
      await app.stop();
    }
  });

  test("todo CRUD and swagger routes work with libsql", async () => {
    const app = await createPlaygroundApp({
      port: 0,
      env: createTestEnv(dbPath),
    });

    await app.start();

    try {
      const server = app.get(Server);
      const { accessToken, userId } = await registerAndGetToken(server);

      const createdResponse = await server.handle(
        new Request("http://localhost/todo", {
          method: "POST",
          headers: authHeaders(accessToken),
          body: JSON.stringify({
            title: " Test Swagger with libSQL ",
          }),
        }),
      );

      expect(createdResponse.status).toBe(201);
      const created = await createdResponse.json() as Record<string, unknown>;
      expect(created.title).toBe("Test Swagger with libSQL");
      expect(created.completed).toBe(false);
      expect(typeof created.id).toBe("string");

      const listResponse = await server.handle(
        new Request("http://localhost/todo", {
          headers: { authorization: `Bearer ${accessToken}` },
        }),
      );
      expect(listResponse.status).toBe(200);
      const listBody = await listResponse.json() as { items: Array<Record<string, unknown>> };
      expect(listBody.items).toHaveLength(1);
      expect(listBody.items[0]?.id).toBe(created.id);

      const getResponse = await server.handle(
        new Request(`http://localhost/todo/${created.id as string}`, {
          headers: { authorization: `Bearer ${accessToken}` },
        }),
      );
      expect(getResponse.status).toBe(200);
      expect((await getResponse.json() as Record<string, unknown>).id).toBe(created.id);

      const patchResponse = await server.handle(
        new Request(`http://localhost/todo/${created.id as string}`, {
          method: "PATCH",
          headers: authHeaders(accessToken),
          body: JSON.stringify({
            title: "Updated title",
            completed: true,
          }),
        }),
      );

      expect(patchResponse.status).toBe(200);
      const patched = await patchResponse.json() as Record<string, unknown>;
      expect(patched.title).toBe("Updated title");
      expect(patched.completed).toBe(true);

      const swaggerResponse = await server.handle(new Request("http://localhost/swagger.json"));
      expect(swaggerResponse.status).toBe(200);
      const swaggerDocument = await swaggerResponse.json() as {
        paths: Record<string, {
          get?: {
            responses?: Record<string, { content?: { "application/json"?: { schema?: { properties?: Record<string, unknown>; }; }; }; }>;
          };
          post?: {
            requestBody?: { content?: { "application/json"?: { schema?: { properties?: Record<string, unknown>; required?: string[]; }; }; }; };
            responses?: Record<string, { content?: { "application/problem+json"?: { schema?: { properties?: Record<string, unknown>; }; }; }; }>;
          };
          delete?: {
            responses?: Record<string, { content?: { "application/json"?: { schema?: { properties?: Record<string, unknown>; }; }; }; }>;
          };
        }>;
        components?: { securitySchemes?: Record<string, unknown> };
      };
      expect(swaggerDocument.paths["/todo"]).toBeDefined();
      expect(swaggerDocument.paths["/todo/{id}"]).toBeDefined();
      expect(
        swaggerDocument.paths["/todo"]?.post?.requestBody?.content?.["application/json"]?.schema
          ?.properties,
      ).toEqual({
        title: {
          type: "string",
          description: "Todo title",
        },
      });
      expect(
        swaggerDocument.paths["/todo"]?.post?.requestBody?.content?.["application/json"]?.schema
          ?.required,
      ).toEqual(["title"]);
      expect(
        swaggerDocument.paths["/health"]?.get?.responses?.["200"]?.content?.["application/json"]
          ?.schema?.properties,
      ).toEqual({
        ok: {
          type: "boolean",
          description: "Whether the API is healthy.",
        },
      });
      expect(
        swaggerDocument.paths["/todo/{id}"]?.delete?.responses?.["200"]?.content?.["application/json"]
          ?.schema?.properties,
      ).toEqual({
        deleted: {
          type: "boolean",
          description: "Whether the todo was deleted.",
        },
      });
      expect(
        swaggerDocument.paths["/todo"]?.post?.responses?.["400"]?.content?.["application/problem+json"]
          ?.schema?.properties,
      ).toBeDefined();
      expect(swaggerDocument.components?.securitySchemes?.bearerAuth).toBeDefined();

      const docsResponse = await server.handle(new Request("http://localhost/docs"));
      expect(docsResponse.status).toBe(200);
      expect(await docsResponse.text()).toContain("SwaggerUIBundle");
      expect(
        swaggerDocument.paths["/health"],
      ).toBeDefined();

      const authScope = app.createScope();
      const roleService = authScope.resolve(AuthRoleService);
      await roleService.createRole({ name: "admin" });
      await roleService.assignRoleToUser(userId, "admin");
      await authScope.destroy();

      const deleteResponse = await server.handle(
        new Request(`http://localhost/todo/${created.id as string}`, {
          method: "DELETE",
          headers: { authorization: `Bearer ${accessToken}` },
        }),
      );
      expect(deleteResponse.status).toBe(200);
      expect(await deleteResponse.json()).toEqual({ deleted: true });

      const missingResponse = await server.handle(
        new Request(`http://localhost/todo/${created.id as string}`, {
          headers: { authorization: `Bearer ${accessToken}` },
        }),
      );
      expect(missingResponse.status).toBe(404);
    } finally {
      await app.stop();
    }
  });

  test("validation errors return 400 problem responses", async () => {
    const app = await createPlaygroundApp({
      port: 0,
      env: createTestEnv(dbPath),
    });

    await app.start();

    try {
      const server = app.get(Server);
      const { accessToken } = await registerAndGetToken(server);

      const createResponse = await server.handle(
        new Request("http://localhost/todo", {
          method: "POST",
          headers: authHeaders(accessToken),
          body: JSON.stringify({
            title: "   ",
          }),
        }),
      );

      expect(createResponse.status).toBe(400);
      expect(createResponse.headers.get("content-type")).toContain("application/problem+json");
      expect(await createResponse.json()).toEqual({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "Title is required.",
        code: "TODO_VALIDATION_ERROR",
      });

      const patchResponse = await server.handle(
        new Request("http://localhost/todo/some-id", {
          method: "PATCH",
          headers: authHeaders(accessToken),
          body: JSON.stringify({
            title: "   ",
          }),
        }),
      );

      expect(patchResponse.status).toBe(400);
      expect(patchResponse.headers.get("content-type")).toContain("application/problem+json");
      expect(await patchResponse.json()).toEqual({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "Title cannot be empty.",
        code: "TODO_VALIDATION_ERROR",
      });
    } finally {
      await app.stop();
    }
  });

  test("rate limit returns 429 when max is exceeded and sets rate-limit headers", async () => {
    const app = await createPlaygroundApp({
      port: 0,
      env: createTestEnv(dbPath),
      rateLimit: { windowMs: 60_000, max: 3 },
    });

    await app.start();

    try {
      const server = app.get(Server);
      const ip = "203.0.113.7";

      const r1 = await server.handle(
        new Request("http://localhost/health", { headers: { "x-forwarded-for": ip } }),
      );
      const r2 = await server.handle(
        new Request("http://localhost/health", { headers: { "x-forwarded-for": ip } }),
      );
      const r3 = await server.handle(
        new Request("http://localhost/health", { headers: { "x-forwarded-for": ip } }),
      );
      const r4 = await server.handle(
        new Request("http://localhost/health", { headers: { "x-forwarded-for": ip } }),
      );

      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
      expect(r3.status).toBe(200);
      expect(r4.status).toBe(429);
      expect(r4.headers.get("content-type")).toContain("application/problem+json");

      const body = await r4.json() as Record<string, unknown>;
      expect(body["status"]).toBe(429);
      expect(body["code"]).toBe("RATE_LIMIT_EXCEEDED");

      expect(r4.headers.get("Retry-After")).toBeTruthy();
      expect(r4.headers.get("X-RateLimit-Limit")).toBe("3");
      expect(r4.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(r4.headers.get("X-RateLimit-Reset")).toBeTruthy();

      expect(r1.headers.get("X-RateLimit-Limit")).toBe("3");
      expect(r1.headers.get("X-RateLimit-Remaining")).toBe("2");
    } finally {
      await app.stop();
    }
  });

  test("rate limit is scoped per route in the playground app", async () => {
    const app = await createPlaygroundApp({
      port: 0,
      env: createTestEnv(dbPath),
      rateLimit: { windowMs: 60_000, max: 1 },
    });

    await app.start();

    try {
      const server = app.get(Server);
      const ip = "203.0.113.8";

      const healthFirst = await server.handle(
        new Request("http://localhost/health", { headers: { "x-forwarded-for": ip } }),
      );
      const healthSecond = await server.handle(
        new Request("http://localhost/health", { headers: { "x-forwarded-for": ip } }),
      );
      const swaggerFirst = await server.handle(
        new Request("http://localhost/swagger.json", { headers: { "x-forwarded-for": ip } }),
      );

      expect(healthFirst.status).toBe(200);
      expect(healthSecond.status).toBe(429);
      expect(swaggerFirst.status).toBe(200);
    } finally {
      await app.stop();
    }
  });

  test("rate limit is scoped per client IP in the playground app", async () => {
    const app = await createPlaygroundApp({
      port: 0,
      env: createTestEnv(dbPath),
      rateLimit: { windowMs: 60_000, max: 1 },
    });

    await app.start();

    try {
      const server = app.get(Server);

      const ip1 = await server.handle(
        new Request("http://localhost/health", { headers: { "x-forwarded-for": "203.0.113.9" } }),
      );
      const ip2 = await server.handle(
        new Request("http://localhost/health", { headers: { "x-forwarded-for": "203.0.113.10" } }),
      );

      expect(ip1.status).toBe(200);
      expect(ip2.status).toBe(200);
    } finally {
      await app.stop();
    }
  });
});
