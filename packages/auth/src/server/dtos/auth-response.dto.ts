// file: packages/auth/src/server/dtos/auth-response.dto.ts

import { ApiDto, ApiField } from "@genspire/server";
import { AuthUserResponseDto } from "./auth-user.dto.js";
import type { IAuthResponseDto } from "../contracts.js";

@ApiDto({ description: "Authentication response with tokens and user" })
export class AuthResponseDto implements IAuthResponseDto {
  @ApiField({ dto: AuthUserResponseDto, description: "Authenticated user" })
  user!: AuthUserResponseDto;

  @ApiField({ type: "string", description: "JWT access token" })
  accessToken!: string;

  @ApiField({ type: "string", description: "Refresh token" })
  refreshToken!: string;

  @ApiField({ type: "number", description: "Access token TTL in seconds" })
  expiresIn!: number;

  @ApiField({ type: "string", description: "Token type" })
  tokenType!: string;
}
