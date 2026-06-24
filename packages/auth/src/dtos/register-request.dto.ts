// file: packages\auth\src\dtos\register-request.dto.ts

import { ApiDto, ApiField } from "@genspire/server";

@ApiDto({ description: "Register a new user" })
export class RegisterRequestDto {
  @ApiField({ type: "string", description: "Email address" })
  email!: string;

  @ApiField({ type: "string", description: "Password" })
  password!: string;

  @ApiField({ type: "string", description: "Display name", nullable: true, required: false })
  displayName?: string;
}
