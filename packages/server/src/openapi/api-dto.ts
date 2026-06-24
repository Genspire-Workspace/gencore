// file: packages\server\src\openapi\api-dto.ts

import type { OpenApiSchema, OpenApiTypeDefinition } from "./openapi-types.js";
import { apiArrayOf as createApiArrayOf, type ApiArrayTypeDefinition, defineApiType } from "./schema-helpers.js";

export interface ApiDtoOptions {
  description?: string;
  contentType?: string;
}

export interface ApiDtoFieldOptions extends Omit<Partial<OpenApiSchema>, "required" | "items" | "properties"> {
  required?: boolean;
  dto?: ApiSchemaInput;
  arrayOf?: ApiSchemaInput;
}

interface ApiDtoFieldMetadata extends ApiDtoFieldOptions {}

interface ApiDtoMetadata {
  options: ApiDtoOptions;
  fields: Record<string, ApiDtoFieldMetadata>;
}

export interface ApiDtoClass<T = unknown> {
  new (...args: any[]): T;
  __apiDtoMetadata?: ApiDtoMetadata;
}

const SYMBOL_METADATA =
  (Symbol as typeof Symbol & { metadata?: symbol }).metadata ??
  Symbol.for("Symbol.metadata");
const API_DTO_STAGE3_METADATA_KEY = Symbol.for("genspire.api-dto.stage3");

type DecoratorContextLike = {
  metadata?: Record<PropertyKey, unknown>;
  name?: string | symbol;
};

export type ApiSchemaThunk = () => ApiSchemaInput;
export type ApiSchemaInput =
  | OpenApiTypeDefinition
  | ApiDtoClass
  | ApiArrayTypeDefinition
  | ApiSchemaThunk;

function createEmptyMetadata(): ApiDtoMetadata {
  return {
    options: {},
    fields: {},
  };
}

function ensureDtoMetadata(target: ApiDtoClass): ApiDtoMetadata {
  if (!target.__apiDtoMetadata) {
    target.__apiDtoMetadata = createEmptyMetadata();
  }

  return target.__apiDtoMetadata;
}

function getStage3DtoMetadata(target: ApiDtoClass | DecoratorContextLike): ApiDtoMetadata {
  const container =
    "metadata" in target
      ? (target.metadata ??= {})
      : (((target as ApiDtoClass & {
          [SYMBOL_METADATA]?: Record<PropertyKey, unknown>;
        })[SYMBOL_METADATA] ??= {}) as Record<PropertyKey, unknown>);

  if (container[API_DTO_STAGE3_METADATA_KEY]) {
    return container[API_DTO_STAGE3_METADATA_KEY] as ApiDtoMetadata;
  }

  const created = createEmptyMetadata();
  container[API_DTO_STAGE3_METADATA_KEY] = created;
  return created;
}

function getClassMetadataContainer(
  target: ApiDtoClass,
): Record<PropertyKey, unknown> | undefined {
  const direct = (
    target as ApiDtoClass & { [SYMBOL_METADATA]?: Record<PropertyKey, unknown> }
  )[SYMBOL_METADATA];

  if (direct) {
    return direct;
  }

  const metadataSymbol = Object.getOwnPropertySymbols(target).find(
    (symbol) => symbol.toString() === "Symbol(Symbol.metadata)",
  );

  if (!metadataSymbol) {
    return undefined;
  }

  return (target as unknown as Record<PropertyKey, unknown>)[metadataSymbol] as
    | Record<PropertyKey, unknown>
    | undefined;
}

function getMergedDtoMetadata(target: ApiDtoClass): ApiDtoMetadata {
  const metadata = ensureDtoMetadata(target);
  const symbolMetadataContainer = getClassMetadataContainer(target);
  const symbolMetadata = symbolMetadataContainer?.[
    API_DTO_STAGE3_METADATA_KEY
  ] as ApiDtoMetadata | undefined;

  if (!symbolMetadata) {
    return metadata;
  }

  metadata.options = {
    ...symbolMetadata.options,
    ...metadata.options,
  };

  for (const [name, field] of Object.entries(symbolMetadata.fields)) {
    metadata.fields[name] = {
      ...field,
      ...metadata.fields[name],
    };
  }

  return metadata;
}

function isApiDtoClass(value: unknown): value is ApiDtoClass {
  return typeof value === "function";
}

function isApiArrayTypeDefinition(value: unknown): value is ApiArrayTypeDefinition {
  return Boolean(value && typeof value === "object" && "item" in value);
}

function isOpenApiTypeDefinition(value: unknown): value is OpenApiTypeDefinition {
  return Boolean(value && typeof value === "object" && "schema" in value);
}

function resolveSchemaInput(input: ApiSchemaInput): Exclude<ApiSchemaInput, ApiSchemaThunk> {
  let current: ApiSchemaInput = input;

  while (typeof current === "function" && !isApiDtoClass(current) && !isOpenApiTypeDefinition(current)) {
    current = (current as ApiSchemaThunk)();
  }

  return current as Exclude<ApiSchemaInput, ApiSchemaThunk>;
}

function fieldToSchema(
  field: ApiDtoFieldMetadata,
  seen: Set<ApiDtoClass>,
): OpenApiSchema {
  if (field.dto) {
    return apiTypeToOpenApiDefinitionInternal(field.dto, seen).schema;
  }

  if (field.arrayOf) {
    return {
      type: "array",
      items: apiTypeToOpenApiDefinitionInternal(field.arrayOf, seen).schema,
      description: field.description,
      example: field.example,
    };
  }

  return {
    type: field.type ?? "string",
    format: field.format,
    description: field.description,
    nullable: field.nullable,
    enum: field.enum,
    example: field.example,
    additionalProperties: field.additionalProperties,
  };
}

export function ApiDto(options: ApiDtoOptions = {}) {
  return function <T extends ApiDtoClass>(value: T, context?: ClassDecoratorContext) {
    const metadata = ensureDtoMetadata(value);
    metadata.options = {
      contentType: options.contentType ?? metadata.options.contentType ?? "application/json",
      description: options.description ?? metadata.options.description,
    };

    if (context) {
      const stage3Metadata = getStage3DtoMetadata(context);
      stage3Metadata.options = metadata.options;
    }

    return value;
  };
}

export function ApiField(options: ApiDtoFieldOptions = {}) {
  return function (
    _value: unknown,
    context: ClassFieldDecoratorContext | string | symbol,
  ) {
    if (typeof context === "object" && context !== null) {
      const metadata = getStage3DtoMetadata(context);
      metadata.fields[String(context.name)] = options;
      return;
    }

    const [prototype, propertyKey] = arguments as unknown as [
      { constructor: ApiDtoClass },
      string | symbol,
    ];
    const metadata = ensureDtoMetadata(prototype.constructor);
    metadata.fields[String(propertyKey)] = options;
  };
}

function apiDtoToTypeDefinitionInternal(
  dto: ApiDtoClass,
  seen: Set<ApiDtoClass>,
): OpenApiTypeDefinition {
  if (seen.has(dto)) {
    const metadata = ensureDtoMetadata(dto);
    return defineApiType(
      {
        type: "object",
      },
      {
        contentType: metadata.options.contentType ?? "application/json",
        description: metadata.options.description,
      },
    );
  }

  seen.add(dto);
  const metadata = getMergedDtoMetadata(dto);
  const properties: Record<string, OpenApiSchema> = {};
  const required: string[] = [];

  for (const [propertyName, field] of Object.entries(metadata.fields)) {
    properties[propertyName] = fieldToSchema(field, seen);
    if (field.required !== false) {
      required.push(propertyName);
    }
  }

  const definition = defineApiType(
    {
      type: "object",
      properties,
      required,
      additionalProperties: false,
    },
    {
      contentType: metadata.options.contentType ?? "application/json",
      description: metadata.options.description,
    },
  );

  seen.delete(dto);
  return definition;
}

export function apiDtoToTypeDefinition(dto: ApiDtoClass): OpenApiTypeDefinition {
  return apiDtoToTypeDefinitionInternal(dto, new Set());
}

function apiTypeToOpenApiDefinitionInternal(
  input: ApiSchemaInput,
  seen: Set<ApiDtoClass>,
): OpenApiTypeDefinition {
  const resolved = resolveSchemaInput(input);

  if (isOpenApiTypeDefinition(resolved)) {
    return resolved;
  }

  if (isApiArrayTypeDefinition(resolved)) {
    const itemType = apiTypeToOpenApiDefinitionInternal(resolved.item, seen);
    return defineApiType(
      {
        type: "array",
        items: itemType.schema,
      },
      {
        contentType: resolved.contentType ?? itemType.contentType,
        description: resolved.description,
      },
    );
  }

  return apiDtoToTypeDefinitionInternal(resolved, seen);
}

export function apiTypeToOpenApiDefinition(input: ApiSchemaInput): OpenApiTypeDefinition {
  return apiTypeToOpenApiDefinitionInternal(input, new Set());
}

export const apiArrayOf = createApiArrayOf;
