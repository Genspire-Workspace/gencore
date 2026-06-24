import { describe, expect, test } from "bun:test";
import type { RegisteredRoute } from "../routing/router.js";
import { buildOpenApiDocument, inferPathParameters, toOpenApiPath } from "./openapi-builder.js";

describe("openapi builder", () => {
  test("/todo/:id becomes /todo/{id}", () => {
    expect(toOpenApiPath("/todo/:id")).toBe("/todo/{id}");
  });

  test("path params are inferred", () => {
    expect(inferPathParameters("/todo/:id")).toEqual([
      {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string" },
      },
    ]);
  });

  test("builds path entries", () => {
    const routes: RegisteredRoute[] = [
      {
        method: "GET",
        path: "/todo/:id",
        handler: async () => ({ ok: true }),
      },
    ];

    const document = buildOpenApiDocument(routes, {
      title: "Test",
      version: "1.0.0",
    });

    expect(document.paths["/todo/{id}"]).toBeDefined();
  });
});
