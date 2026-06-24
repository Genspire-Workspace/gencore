import { Scoped, GenError } from "@genspire/core";
import { AuthDbContext } from "../context/auth-db-context.js";
import { AuthRoleEntity } from "../entities/auth-role.entity.js";
import { AuthUserRoleEntity } from "../entities/auth-user-role.entity.js";

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
}
