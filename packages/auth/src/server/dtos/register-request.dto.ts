// file: packages/auth/src/server/dtos/register-request.dto.ts

import { ApiDto, ApiField } from "@genspire/server";
import type { IRegisterRequestDto } from "../contracts.js";

@ApiDto({ description: "Register a new user" })
export class RegisterRequestDto implements IRegisterRequestDto {
  @ApiField({ type: "string", description: "Email address" })
  email!: string;

  @ApiField({ type: "string", description: "Password" })
  password!: string;

  @ApiField({ type: "string", description: "Display name", nullable: true, required: false })
  displayName?: string;
}
