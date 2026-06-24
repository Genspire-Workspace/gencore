// file: apps\playground-api\src\health\health.dto.ts

import { ApiDto, ApiField } from "@genspire/server";

@ApiDto({
  description: "Service health response",
})
export class HealthResponse {
  @ApiField({
    type: "boolean",
    description: "Whether the API is healthy.",
  })
  ok!: boolean;
}
