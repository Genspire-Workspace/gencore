// file: packages\server\src\openapi\api-dto.test.ts

import { describe, expect, test } from "bun:test";
import { ApiDto, ApiField, apiDtoToTypeDefinition } from "./api-dto.js";

@ApiDto({
  description: "Example DTO",
})
class ExampleDto {
  @ApiField({ type: "string", description: "Title field" })
  title!: string;

  @ApiField({ type: "boolean", required: false })
  done?: boolean;
}

describe("ApiDto", () => {
  test("converts fields to schema", () => {
    expect(apiDtoToTypeDefinition(ExampleDto)).toEqual({
      contentType: "application/json",
      description: "Example DTO",
      schema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            format: undefined,
            description: "Title field",
            nullable: undefined,
            enum: undefined,
            example: undefined,
            additionalProperties: undefined,
          },
          done: {
            type: "boolean",
            format: undefined,
            description: undefined,
            nullable: undefined,
            enum: undefined,
            example: undefined,
            additionalProperties: undefined,
          },
        },
        required: ["title"],
        additionalProperties: false,
      },
    });
  });
});
