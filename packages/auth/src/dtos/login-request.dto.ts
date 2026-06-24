// file: packages\auth\src\dtos\login-request.dto.ts

import { ApiDto, ApiField } from "@genspire/server";

@ApiDto({ description: "Login with email and password" })
export class LoginRequestDto {
  @ApiField({ type: "string", description: "Email address" })
  email!: string;

  @ApiField({ type: "string", description: "Password" })
  password!: string;
}
