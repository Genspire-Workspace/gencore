import { ApiDto, ApiField } from "@genspire/server";

@ApiDto({ description: "Authenticated user information" })
export class AuthUserResponse {
  @ApiField({ type: "string", description: "User ID" })
  id!: string;

  @ApiField({ type: "string", description: "Email address" })
  email!: string;

  @ApiField({ type: "string", description: "Display name", nullable: true })
  displayName?: string | null;

  @ApiField({ type: "boolean", description: "Whether email is confirmed" })
  emailConfirmed!: boolean;

  @ApiField({ type: "string", description: "Account state" })
  state!: string;

  @ApiField({ type: "string", format: "date-time", description: "When the user was created" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time", description: "When the user was last updated" })
  updatedAt!: string;

  @ApiField({ type: "string", format: "date-time", description: "Last login time", nullable: true, required: false })
  lastLoginAt?: string | null;
}
