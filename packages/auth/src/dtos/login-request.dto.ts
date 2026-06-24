import { ApiDto, ApiField } from "@genspire/server";

@ApiDto({ description: "Login with email and password" })
export class LoginRequest {
  @ApiField({ type: "string", description: "Email address" })
  email!: string;

  @ApiField({ type: "string", description: "Password" })
  password!: string;
}
