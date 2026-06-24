// file: packages\auth\src\dtos\logout-request.dto.ts

import { ApiDto, ApiField } from "@genspire/server";

@ApiDto({ description: "Logout and revoke refresh token" })
export class LogoutRequestDto {
  @ApiField({ type: "string", description: "Refresh token to revoke" })
  refreshToken!: string;
}
