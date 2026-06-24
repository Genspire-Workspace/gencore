// file: packages\auth\src\controllers\role.controller.ts

import { Authorize, Controller, Delete, Get, Post, Put } from "@genspire/server";
import type { RequestContext } from "@genspire/server";
import { json, problem } from "@genspire/server";
import { defineProblemDetailsType } from "@genspire/server";
import { AuthRoleService } from "../services/auth-role.service.js";
import {
  AssignRoleRequestDto,
  CreateRoleRequestDto,
  RoleResponseDto,
  UpdateRoleRequestDto,
  UserRolesResponseDto,
} from "../dtos/role.dto.js";
import type { AuthRoleEntity } from "../entities/auth-role.entity.js";

function toRoleResponse(role: AuthRoleEntity): RoleResponseDto {
  return {
    id: role.id,
    name: role.name,
    normalizedName: role.normalizedName,
    description: role.description,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

const errorResponse = {
  400: {
    description: "Validation error",
    body: defineProblemDetailsType("Validation problem response"),
  },
  404: {
    description: "Not found",
    body: defineProblemDetailsType("Not found problem response"),
  },
} as const;

@Authorize({ roles: ["admin"] })
@Controller("/roles", {
  tag: "Auth Roles",
  description: "Role management endpoints",
})
export class RoleController {
  static inject = [AuthRoleService];

  constructor(private readonly roleService: AuthRoleService) {}

  @Get("/", {
    summary: "List all roles",
    response: RoleResponseDto,
  })
  async list(): Promise<RoleResponseDto[]> {
    const roles = await this.roleService.listRoles();
    return roles.map(toRoleResponse);
  }

  @Post("/", {
    summary: "Create a role",
    requestBody: CreateRoleRequestDto,
    response: RoleResponseDto,
    responses: errorResponse,
  })
  async create(ctx: RequestContext): Promise<Response> {
    const body = await ctx.json<CreateRoleRequestDto>();
    const role = await this.roleService.createRole(body);
    return json(toRoleResponse(role), { status: 201 });
  }

  @Put("/:id", {
    summary: "Update a role",
    requestBody: UpdateRoleRequestDto,
    response: RoleResponseDto,
    responses: {
      ...errorResponse,
      404: {
        description: "Role not found",
        body: defineProblemDetailsType("Role not found"),
      },
    },
  })
  async update(ctx: RequestContext): Promise<Response> {
    const body = await ctx.json<UpdateRoleRequestDto>();
    const role = await this.roleService.updateRole(ctx.params.id!, body);
    if (!role) {
      return problem({ title: "Not Found", status: 404, detail: "Role not found." });
    }
    return json(toRoleResponse(role));
  }

  @Delete("/:id", {
    summary: "Delete a role",
    responses: {
      200: { description: "Role deleted" },
      404: {
        description: "Role not found",
        body: defineProblemDetailsType("Role not found"),
      },
    },
  })
  async delete(ctx: RequestContext): Promise<Response> {
    const deleted = await this.roleService.deleteRole(ctx.params.id!);
    if (!deleted) {
      return problem({ title: "Not Found", status: 404, detail: "Role not found." });
    }
    return json({ deleted: true });
  }

  @Get("/:userId", {
    summary: "Get roles for a user",
    response: UserRolesResponseDto,
  })
  async getUserRoles(ctx: RequestContext): Promise<UserRolesResponseDto> {
    const roles = await this.roleService.getUserRoles(ctx.params.userId!);
    return { userId: ctx.params.userId!, roles };
  }

  @Post("/:userId", {
    summary: "Assign a role to a user",
    requestBody: AssignRoleRequestDto,
    responses: {
      200: { description: "Role assigned" },
      400: {
        description: "Validation error",
        body: defineProblemDetailsType("Validation error"),
      },
    },
  })
  async assignRole(ctx: RequestContext): Promise<Response> {
    const body = await ctx.json<AssignRoleRequestDto>();
    await this.roleService.assignRoleToUser(ctx.params.userId!, body.roleName);
    const roles = await this.roleService.getUserRoles(ctx.params.userId!);
    return json({ userId: ctx.params.userId!, roles } satisfies UserRolesResponseDto);
  }

  @Delete("/:userId", {
    summary: "Remove a role from a user",
    requestBody: AssignRoleRequestDto,
    responses: {
      200: { description: "Role removed" },
    },
  })
  async removeRole(ctx: RequestContext): Promise<Response> {
    const body = await ctx.json<AssignRoleRequestDto>();
    await this.roleService.removeRoleFromUser(ctx.params.userId!, body.roleName);
    const roles = await this.roleService.getUserRoles(ctx.params.userId!);
    return json({ userId: ctx.params.userId!, roles } satisfies UserRolesResponseDto);
  }
}
