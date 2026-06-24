// file: packages\auth\src\dtos\refresh-request.dto.ts

import { ApiDto, ApiField } from "@genspire/server";

@ApiDto({ description: "Refresh access token" })
export class RefreshRequestDto {
  @ApiField({ type: "string", description: "Refresh token" })
  refreshToken!: string;
}
