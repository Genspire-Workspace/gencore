import { ApiDto, ApiField } from "@genspire/server";

@ApiDto({ description: "Logout and revoke refresh token" })
export class LogoutRequest {
  @ApiField({ type: "string", description: "Refresh token to revoke" })
  refreshToken!: string;
}
