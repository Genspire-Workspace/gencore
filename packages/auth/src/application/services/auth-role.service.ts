// file: packages/auth/src/application/services/auth-role.service.ts

import { Scoped, GenError } from "@genspire/core";
import { AuthDbContext } from "../../infrastructure/persistence/auth-db-context.js";
import { AuthRoleEntity } from "../../domain/entities/auth-role.entity.js";
import { AuthUserRoleEntity } from "../../domain/entities/auth-user-role.entity.js";

@Scoped()
export class AuthRoleService {
  static inject = [AuthDbContext];

  constructor(private readonly db: AuthDbContext) {}

  async createRole(input: { name: string; description?: string | null }): Promise<AuthRoleEntity> {
    const normalizedName = input.name.trim().toLowerCase();
    if (!normalizedName) {
      throw new GenError("Role name is required.", "AUTH_VALIDATION_ERROR");
    }

    const existing = await this.db.roles.findOne({ normalizedName } as Partial<AuthRoleEntity>);
    if (existing) {
      return existing;
    }

    const role = new AuthRoleEntity();
    role.id = crypto.randomUUID();
    role.name = input.name.trim();
    role.normalizedName = normalizedName;
    role.description = input.description ?? null;
    role.createdAt = new Date();
    role.updatedAt = new Date();

    await this.db.roles.add(role);
    await this.db.saveChanges();
    return role;
  }

  async assignRoleToUser(userId: string, roleName: string): Promise<void> {
    const normalizedName = roleName.trim().toLowerCase();
    if (!normalizedName) {
      throw new GenError("Role name is required.", "AUTH_VALIDATION_ERROR");
    }

    const role = await this.db.roles.findOne({ normalizedName } as Partial<AuthRoleEntity>);
    if (!role) {
      throw new GenError(`Role '${roleName}' not found.`, "AUTH_VALIDATION_ERROR");
    }

    const existing = await this.db.userRoles.findOne({
      userId,
      roleId: role.id,
    } as Partial<AuthUserRoleEntity>);

    if (existing) {
      return;
    }

    const userRole = new AuthUserRoleEntity();
    userRole.id = crypto.randomUUID();
    userRole.userId = userId;
    userRole.roleId = role.id;
    userRole.roleName = normalizedName;
    userRole.createdAt = new Date();

    await this.db.userRoles.add(userRole);
    await this.db.saveChanges();
  }

  async removeRoleFromUser(userId: string, roleName: string): Promise<void> {
    const normalizedName = roleName.trim().toLowerCase();
    const entry = await this.db.userRoles.findOne({
      userId,
      roleName: normalizedName,
    } as Partial<AuthUserRoleEntity>);

    if (entry) {
      await this.db.userRoles.remove(entry);
      await this.db.saveChanges();
    }
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const entries = await this.db.userRoles.list({ where: { userId } as Partial<AuthUserRoleEntity> });
    return entries.map((e) => e.roleName);
  }

  async userHasAnyRole(userId: string, roles: readonly string[]): Promise<boolean> {
    if (roles.length === 0) {
      return true;
    }

    const normalizedRoles = roles.map((r) => r.trim().toLowerCase());
    const entries = await this.db.userRoles.list({ where: { userId } as Partial<AuthUserRoleEntity> });
    return entries.some((e) => normalizedRoles.includes(e.roleName));
  }

  async listRoles(): Promise<AuthRoleEntity[]> {
    return await this.db.roles.list({ orderBy: "normalizedName" as keyof AuthRoleEntity & string, direction: "asc" });
  }

  async getRoleById(id: string): Promise<AuthRoleEntity | null> {
    return await this.db.roles.findById(id);
  }

  async getRoleByName(name: string): Promise<AuthRoleEntity | null> {
    const normalized = name.trim().toLowerCase();
    return await this.db.roles.findOne({ normalizedName: normalized } as Partial<AuthRoleEntity>);
  }

  async updateRole(id: string, input: { name?: string; description?: string | null }): Promise<AuthRoleEntity | null> {
    const role = await this.db.roles.findById(id);
    if (!role) {
      return null;
    }

    if (input.name !== undefined) {
      const newName = input.name.trim();
      if (!newName) {
        throw new GenError("Role name is required.", "AUTH_VALIDATION_ERROR");
      }
      const normalized = newName.toLowerCase();
      if (normalized !== role.normalizedName) {
        const conflict = await this.db.roles.findOne({ normalizedName: normalized } as Partial<AuthRoleEntity>);
        if (conflict) {
          throw new GenError("A role with this name already exists.", "AUTH_VALIDATION_CONFLICT");
        }
        role.normalizedName = normalized;
      }
      role.name = newName;
    }

    if (input.description !== undefined) {
      role.description = input.description ?? null;
    }

    role.updatedAt = new Date();
    await this.db.roles.update(role);
    await this.db.saveChanges();
    return role;
  }

  async deleteRole(id: string): Promise<boolean> {
    const role = await this.db.roles.findById(id);
    if (!role) {
      return false;
    }

    const userRoles = await this.db.userRoles.list({
      where: { roleId: id } as Partial<AuthUserRoleEntity>,
    });

    for (const ur of userRoles) {
      await this.db.userRoles.remove(ur);
    }

    await this.db.roles.remove(role);
    await this.db.saveChanges();
    return true;
  }

  async getUsersWithRole(roleName: string): Promise<string[]> {
    const normalized = roleName.trim().toLowerCase();
    const entries = await this.db.userRoles.list({
      where: { roleName: normalized } as Partial<AuthUserRoleEntity>,
    });
    return entries.map((e) => e.userId);
  }
}
