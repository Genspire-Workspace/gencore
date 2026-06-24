import type { OpenApiSchema, OpenApiTypeDefinition } from "../openapi/openapi-types.js";

export interface ApiArrayTypeDefinition {
  item: import("./api-dto.js").ApiSchemaInput;
  description?: string;
  contentType?: string;
}

export function defineApiType(
  schema: OpenApiSchema,
  options?: Omit<OpenApiTypeDefinition, "schema">,
): OpenApiTypeDefinition {
  return {
    contentType: options?.contentType ?? "application/json",
    description: options?.description,
    schema,
  };
}

export function arrayOf(type: OpenApiTypeDefinition): OpenApiTypeDefinition {
  return {
    contentType: type.contentType,
    description: type.description,
    schema: {
      type: "array",
      items: type.schema,
    },
  };
}

export function apiArrayOf(item: import("./api-dto.js").ApiSchemaInput): ApiArrayTypeDefinition {
  return { item };
}
