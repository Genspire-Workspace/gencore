// file: packages/auth/src/server/dtos/refresh-request.dto.ts

import { ApiDto, ApiField } from "@genspire/server";
import type { IRefreshRequestDto } from "../contracts.js";

@ApiDto({ description: "Refresh access token" })
export class RefreshRequestDto implements IRefreshRequestDto {
  @ApiField({ type: "string", description: "Refresh token" })
  refreshToken!: string;
}
