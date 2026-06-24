import { defineApiType } from "./schema-helpers.js";
import type { OpenApiTypeDefinition } from "./openapi-types.js";

export function defineProblemDetailsType(
  description = "Problem details response",
): OpenApiTypeDefinition {
  return defineApiType(
    {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "A URI reference that identifies the problem type.",
        },
        title: {
          type: "string",
          description: "A short, human-readable summary of the problem.",
        },
        status: {
          type: "number",
          description: "The HTTP status code generated for this occurrence of the problem.",
        },
        detail: {
          type: "string",
          description: "A human-readable explanation specific to this occurrence of the problem.",
        },
        instance: {
          type: "string",
          description: "A URI reference that identifies the specific occurrence of the problem.",
        },
        code: {
          type: "string",
          description: "An application-specific error code.",
        },
        errors: {
          type: "object",
          description: "Field-level validation errors.",
          additionalProperties: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
      },
      required: ["title", "status"],
      additionalProperties: false,
    },
    {
      contentType: "application/problem+json",
      description,
    },
  );
}
