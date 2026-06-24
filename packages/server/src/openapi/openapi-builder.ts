// file: packages\server\src\openapi\openapi-builder.ts

import type {
  HttpResponseDoc,
  HttpRouteDocs,
} from "../http/http-types.js";
import type { ControllerClass, ControllerOptions } from "../controllers/controller-metadata.js";
import { apiTypeToOpenApiDefinition } from "./api-dto.js";
import type { OpenApiDocument, OpenApiSchema } from "./openapi-types.js";
import type { RegisteredRoute } from "../routing/router.js";

export interface OpenApiBuilderOptions {
  title: string;
  version: string;
  description?: string;
  jsonPath?: string;
  docsPath?: string;
}

function humanize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

export function toOpenApiPath(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

export function inferPathParameters(path: string): Array<Record<string, unknown>> {
  return [...path.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => ({
    name: match[1],
    in: "path",
    required: true,
    schema: { type: "string" },
  }));
}

function inferTags(route: RegisteredRoute): readonly string[] {
  if (route.docs?.tags && route.docs.tags.length > 0) {
    return route.docs.tags;
  }

  if (route.controllerOptions?.tag) {
    return [route.controllerOptions.tag];
  }

  if (route.controllerClass) {
    return [route.controllerClass.name.replace(/Controller$/, "")];
  }

  return ["Default"];
}

function inferSummary(route: RegisteredRoute): string {
  if (route.docs?.summary) {
    return route.docs.summary;
  }

  if (route.handlerName) {
    return humanize(route.handlerName);
  }

  return `${route.method} ${route.path}`;
}

function inferDescription(route: RegisteredRoute): string | undefined {
  return route.docs?.description ?? route.controllerOptions?.description;
}

function inferDefaultStatus(method: string): string {
  switch (method) {
    case "POST":
      return "201";
    case "DELETE":
      return "200";
    default:
      return "200";
  }
}

function normalizeQuerySchema(schema: OpenApiSchema): OpenApiSchema {
  if (schema.type === "array") {
    return {
      type: "array",
      items: schema.items ?? { type: "string" },
      description: schema.description,
      example: schema.example,
    };
  }

  return {
    type: schema.type ?? "string",
    format: schema.format,
    description: schema.description,
    nullable: schema.nullable,
    enum: schema.enum,
    example: schema.example,
  };
}

function buildQueryParameters(query?: unknown): Array<Record<string, unknown>> {
  if (!query) {
    return [];
  }

  const definition = apiTypeToOpenApiDefinition(query as never);
  const properties = definition.schema.properties ?? {};
  const required = new Set(definition.schema.required ?? []);

  return Object.entries(properties).map(([name, schema]) => ({
    name,
    in: "query",
    required: required.has(name),
    description: schema.description,
    schema: normalizeQuerySchema(schema),
  }));
}

function buildRequestBody(input?: unknown): Record<string, unknown> | undefined {
  if (!input) {
    return undefined;
  }

  const definition = apiTypeToOpenApiDefinition(input as never);
  return {
    content: {
      [definition.contentType ?? "application/json"]: {
        schema: definition.schema,
      },
    },
    required: true,
    description: definition.description,
  };
}

function isHttpResponseDoc(value: unknown): value is HttpResponseDoc {
  return Boolean(value && typeof value === "object" && ("body" in value || "description" in value || "contentType" in value));
}

function buildResponseEntry(
  input: unknown,
  fallbackDescription: string,
): Record<string, unknown> {
  if (isHttpResponseDoc(input)) {
    if (!input.body) {
      return {
        description: input.description ?? fallbackDescription,
      };
    }

    const definition = apiTypeToOpenApiDefinition(input.body as never);
    return {
      description: input.description ?? definition.description ?? fallbackDescription,
      content: {
        [input.contentType ?? definition.contentType ?? "application/json"]: {
          schema: definition.schema,
        },
      },
    };
  }

  const definition = apiTypeToOpenApiDefinition(input as never);
  return {
    description: definition.description ?? fallbackDescription,
    content: {
      [definition.contentType ?? "application/json"]: {
        schema: definition.schema,
      },
    },
  };
}

function buildResponses(route: RegisteredRoute): Record<string, unknown> {
  const defaultStatus = inferDefaultStatus(route.method);
  const responses: Record<string, unknown> = {};

  if (route.docs?.response) {
    responses[defaultStatus] = buildResponseEntry(route.docs.response, "Success");
  } else {
    responses[defaultStatus] = {
      description: "Success",
    };
  }

  for (const [status, responseDoc] of Object.entries(route.docs?.responses ?? {})) {
    responses[String(status)] = buildResponseEntry(responseDoc, "Response");
  }

  return responses;
}

export function buildOpenApiDocument(
  routes: readonly RegisteredRoute[],
  options: OpenApiBuilderOptions,
): OpenApiDocument {
  const paths: Record<string, Record<string, unknown>> = {};
  let hasProtectedRoute = false;

  for (const route of routes) {
    if (route.hidden) {
      continue;
    }

    if (options.jsonPath && route.path === options.jsonPath) {
      continue;
    }

    if (options.docsPath && route.path === options.docsPath) {
      continue;
    }

    const openApiPath = toOpenApiPath(route.path);
    const method = route.method.toLowerCase();

    if (!paths[openApiPath]) {
      paths[openApiPath] = {};
    }

    const operation: Record<string, unknown> = {
      tags: inferTags(route),
      summary: inferSummary(route),
      description: inferDescription(route),
      deprecated: route.docs?.deprecated ?? false,
      parameters: [
        ...inferPathParameters(route.path),
        ...buildQueryParameters(route.docs?.query),
      ],
      ...(buildRequestBody(route.docs?.requestBody ?? route.docs?.request)
        ? { requestBody: buildRequestBody(route.docs?.requestBody ?? route.docs?.request) }
        : {}),
      responses: buildResponses(route),
    };

    if (route.authorization && !route.authorization.allowAnonymous) {
      if (route.authorization.requiresAuthentication || route.authorization.authorize) {
        hasProtectedRoute = true;
        operation.security = [{ bearerAuth: [] }];

        if (route.authorization.authorize?.roles && route.authorization.authorize.roles.length > 0) {
          operation["x-roles"] = route.authorization.authorize.roles;
        }
      }
    }

    paths[openApiPath]![method] = operation;
  }

  const document: OpenApiDocument = {
    openapi: "3.0.3",
    info: {
      title: options.title,
      version: options.version,
      description: options.description,
    },
    paths,
  };

  if (hasProtectedRoute) {
    document.components = {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    };
  }

  return document;
}
