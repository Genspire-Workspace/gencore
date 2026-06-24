import { ApiDto, ApiField } from "@genspire/server";
import { AuthUserResponse } from "./auth-user.dto.js";

@ApiDto({ description: "Authentication response with tokens and user" })
export class AuthResponse {
  @ApiField({ dto: AuthUserResponse, description: "Authenticated user" })
  user!: AuthUserResponse;

  @ApiField({ type: "string", description: "JWT access token" })
  accessToken!: string;

  @ApiField({ type: "string", description: "Refresh token" })
  refreshToken!: string;

  @ApiField({ type: "number", description: "Access token TTL in seconds" })
  expiresIn!: number;

  @ApiField({ type: "string", description: "Token type" })
  tokenType!: string;
}
