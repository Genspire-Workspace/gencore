// file: packages/auth/src/server/dtos/login-request.dto.ts

import { ApiDto, ApiField } from "@genspire/server";
import type { ILoginRequestDto } from "../contracts.js";

@ApiDto({ description: "Login with email and password" })
export class LoginRequestDto implements ILoginRequestDto {
  @ApiField({ type: "string", description: "Email address" })
  email!: string;

  @ApiField({ type: "string", description: "Password" })
  password!: string;
}
