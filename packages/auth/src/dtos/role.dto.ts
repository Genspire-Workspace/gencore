import { ApiDto, ApiField } from "@genspire/server";

@ApiDto({ description: "A role" })
export class RoleResponseDto {
  @ApiField({ type: "string", description: "Role ID" })
  id!: string;

  @ApiField({ type: "string", description: "Role name" })
  name!: string;

  @ApiField({ type: "string", description: "Normalized role name" })
  normalizedName!: string;

  @ApiField({ type: "string", description: "Role description", nullable: true, required: false })
  description?: string | null;

  @ApiField({ type: "string", format: "date-time", description: "When the role was created" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time", description: "When the role was last updated" })
  updatedAt!: string;
}

@ApiDto({ description: "Request payload for creating a role" })
export class CreateRoleRequestDto {
  @ApiField({ type: "string", description: "Role name" })
  name!: string;

  @ApiField({ type: "string", description: "Role description", nullable: true, required: false })
  description?: string | null;
}

@ApiDto({ description: "Request payload for updating a role" })
export class UpdateRoleRequestDto {
  @ApiField({ type: "string", description: "Role name", required: false })
  name?: string;

  @ApiField({ type: "string", description: "Role description", nullable: true, required: false })
  description?: string | null;
}

@ApiDto({ description: "Request payload for assigning a role to a user" })
export class AssignRoleRequestDto {
  @ApiField({ type: "string", description: "Role name to assign" })
  roleName!: string;
}

@ApiDto({ description: "List of role names for a user" })
export class UserRolesResponseDto {
  @ApiField({ type: "string", description: "User ID", required: false })
  userId?: string;

  @ApiField({ type: "string", description: "Role names" })
  roles!: string[];
}
