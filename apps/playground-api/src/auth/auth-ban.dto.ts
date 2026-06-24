// file: apps\playground-api\src\auth\auth-ban.dto.ts

import { ApiDto, ApiField } from "@genspire/server";

@ApiDto({ description: "Request payload for banning a user" })
export class BanUserRequestDto {
  @ApiField({ type: "string", description: "User ID to ban" })
  userId!: string;

  @ApiField({ type: "string", description: "Reason for the ban", nullable: true, required: false })
  reason?: string | null;
}

@ApiDto({ description: "Request payload for banning an IP address" })
export class BanIpRequestDto {
  @ApiField({ type: "string", description: "IP address to ban" })
  ipAddress!: string;

  @ApiField({ type: "string", description: "Reason for the ban", nullable: true, required: false })
  reason?: string | null;

  @ApiField({ type: "string", format: "date-time", description: "When the ban expires", nullable: true, required: false })
  expiresAt?: string | null;
}

@ApiDto({ description: "A banned IP address record" })
export class BannedIpResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  ipAddress!: string;

  @ApiField({ type: "string", nullable: true, required: false })
  reason?: string | null;

  @ApiField({ type: "string" })
  state!: string;

  @ApiField({ type: "string", format: "date-time" })
  bannedAt!: string;

  @ApiField({ type: "string", nullable: true, required: false })
  bannedByUserId?: string | null;

  @ApiField({ type: "string", format: "date-time", nullable: true, required: false })
  expiresAt?: string | null;

  @ApiField({ type: "string", format: "date-time", nullable: true, required: false })
  revokedAt?: string | null;
}

@ApiDto({ description: "A banned user record" })
export class BannedUserResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  email!: string;

  @ApiField({ type: "string", nullable: true, required: false })
  displayName?: string | null;

  @ApiField({ type: "boolean" })
  emailConfirmed!: boolean;

  @ApiField({ type: "string" })
  state!: string;

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time" })
  updatedAt!: string;

  @ApiField({ type: "string", format: "date-time", nullable: true, required: false })
  lastLoginAt?: string | null;
}

@ApiDto({ description: "List of banned IP records" })
export class BannedIpListResponseDto {
  @ApiField({ arrayOf: BannedIpResponseDto })
  items!: BannedIpResponseDto[];
}

@ApiDto({ description: "List of banned users" })
export class BannedUserListResponseDto {
  @ApiField({ arrayOf: BannedUserResponseDto })
  items!: BannedUserResponseDto[];
}
