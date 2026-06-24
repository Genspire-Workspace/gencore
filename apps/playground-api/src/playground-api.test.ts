import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Server } from "@genspire/server";
import { createPlaygroundApp } from "./playground-app.js";

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
      env: {
        ...process.env,
        GENCORE_PLAYGROUND_LIBSQL_DB_PATH: dbPath,
      },
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

  test("todo CRUD and swagger routes work with libsql", async () => {
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

      const createdResponse = await server.handle(
        new Request("http://localhost/todo", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
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

      const listResponse = await server.handle(new Request("http://localhost/todo"));
      expect(listResponse.status).toBe(200);
      const listBody = await listResponse.json() as { items: Array<Record<string, unknown>> };
      expect(listBody.items).toHaveLength(1);
      expect(listBody.items[0]?.id).toBe(created.id);

      const getResponse = await server.handle(
        new Request(`http://localhost/todo/${created.id as string}`),
      );
      expect(getResponse.status).toBe(200);
      expect((await getResponse.json() as Record<string, unknown>).id).toBe(created.id);

      const patchResponse = await server.handle(
        new Request(`http://localhost/todo/${created.id as string}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
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
            responses?: Record<string, {
              content?: {
                "application/json"?: {
                  schema?: {
                    properties?: Record<string, unknown>;
                  };
                };
              };
            }>;
          };
          post?: {
            requestBody?: {
              content?: {
                "application/json"?: {
                  schema?: {
                    properties?: Record<string, unknown>;
                    required?: string[];
                  };
                };
              };
            };
            responses?: Record<string, {
              content?: {
                "application/problem+json"?: {
                  schema?: {
                    properties?: Record<string, unknown>;
                  };
                };
              };
            }>;
          };
          delete?: {
            responses?: Record<string, {
              content?: {
                "application/json"?: {
                  schema?: {
                    properties?: Record<string, unknown>;
                  };
                };
              };
            }>;
          };
        }>;
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

      const docsResponse = await server.handle(new Request("http://localhost/docs"));
      expect(docsResponse.status).toBe(200);
      expect(await docsResponse.text()).toContain("SwaggerUIBundle");
      expect(
        swaggerDocument.paths["/health"],
      ).toBeDefined();

      const deleteResponse = await server.handle(
        new Request(`http://localhost/todo/${created.id as string}`, {
          method: "DELETE",
        }),
      );
      expect(deleteResponse.status).toBe(200);
      expect(await deleteResponse.json()).toEqual({ deleted: true });

      const missingResponse = await server.handle(
        new Request(`http://localhost/todo/${created.id as string}`),
      );
      expect(missingResponse.status).toBe(404);
    } finally {
      await app.stop();
    }
  });

  test("validation errors return 400 problem responses", async () => {
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

      const createResponse = await server.handle(
        new Request("http://localhost/todo", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
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
          headers: {
            "content-type": "application/json",
          },
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
});
