import { ApiDto, ApiField } from "@genspire/server";

@ApiDto({ description: "Refresh access token" })
export class RefreshRequest {
  @ApiField({ type: "string", description: "Refresh token" })
  refreshToken!: string;
}
