// file: packages/auth/src/server/dtos/logout-request.dto.ts

import { ApiDto, ApiField } from "@genspire/server";
import type { ILogoutRequestDto } from "../contracts.js";

@ApiDto({ description: "Logout and revoke refresh token" })
export class LogoutRequestDto implements ILogoutRequestDto {
  @ApiField({ type: "string", description: "Refresh token to revoke" })
  refreshToken!: string;
}
