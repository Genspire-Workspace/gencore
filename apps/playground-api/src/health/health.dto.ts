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
