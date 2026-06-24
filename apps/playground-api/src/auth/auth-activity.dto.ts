import { ApiDto, ApiField } from "@genspire/server";

@ApiDto({
  description: "A single auth event record",
})
export class AuthEventResponseDto {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string", required: false, nullable: true })
  userId?: string | null;

  @ApiField({ type: "string", required: false, nullable: true })
  email?: string | null;

  @ApiField({ type: "string" })
  eventType!: string;

  @ApiField({ type: "string", required: false, nullable: true })
  ipAddress?: string | null;

  @ApiField({ type: "string", required: false, nullable: true })
  userAgent?: string | null;

  @ApiField({ type: "boolean" })
  success!: boolean;

  @ApiField({ type: "string", required: false, nullable: true })
  failureCode?: string | null;

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;
}

@ApiDto({
  description: "Paginated list of auth events",
})
export class AuthActivityPageResponseDto {
  @ApiField({
    arrayOf: AuthEventResponseDto,
    description: "Auth event items",
  })
  items!: AuthEventResponseDto[];

  @ApiField({ type: "number" })
  total!: number;

  @ApiField({ type: "number" })
  page!: number;

  @ApiField({ type: "number" })
  pageSize!: number;

  @ApiField({ type: "number" })
  totalPages!: number;

  @ApiField({ type: "boolean" })
  hasNextPage!: boolean;

  @ApiField({ type: "boolean" })
  hasPreviousPage!: boolean;
}

@ApiDto({
  description: "Query parameters for auth activity listing",
})
export class AuthActivityQueryDto {
  @ApiField({
    type: "number",
    description: "Page number (1-based)",
    required: false,
  })
  page?: number;

  @ApiField({
    type: "number",
    description: "Items per page",
    required: false,
  })
  pageSize?: number;
}
