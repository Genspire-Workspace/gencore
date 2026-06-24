export interface OpenApiSchema {
  type?: string;
  format?: string;
  description?: string;
  nullable?: boolean;
  enum?: readonly (string | number | boolean | null)[];
  items?: OpenApiSchema;
  properties?: Record<string, OpenApiSchema>;
  required?: readonly string[];
  additionalProperties?: boolean | OpenApiSchema;
  example?: unknown;
}

export interface OpenApiTypeDefinition {
  description?: string;
  contentType?: string;
  schema: OpenApiSchema;
}

export interface OpenApiDocument {
  openapi: "3.0.3";
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, Record<string, unknown>>;
  components?: Record<string, unknown>;
}
