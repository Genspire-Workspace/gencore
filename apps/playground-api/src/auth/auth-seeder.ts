import type { EntityManager } from "@mikro-orm/core";
import { deterministicGuid } from "@genspire/core";
import {
  Argon2PasswordHasher,
  AuthRoleEntity,
  AuthUserRoleEntity,
} from "@genspire/auth";
import type { MikroOrmSeeder } from "@genspire/data-mikroorm";
import { PlaygroundAuthUserEntity } from "./playground-auth-user.entity.js";

export const ADMIN_ID = deterministicGuid("auth:admin");
export const ADMIN_EMAIL = "admin@admin.com";
export const ADMIN_PASSWORD = "@Dmin123!";
export const ADMIN_DISPLAY_NAME = "Admin";

const ADMIN_ROLE_ID = deterministicGuid("auth:role:admin");
const MEMBER_ROLE_ID = deterministicGuid("auth:role:member");

const ROLES = [
  { id: ADMIN_ROLE_ID, name: "Admin", description: "Full system access and management." },
  { id: MEMBER_ROLE_ID, name: "Member", description: "Standard authenticated user." },
] as const;

export const adminUserSeeder: MikroOrmSeeder = {
  name: "admin-user-seeder",

  async run(em: EntityManager): Promise<void> {
    await seedRoles(em);
    await seedAdminUser(em);
    await assignAdminRole(em);
  },
};

async function seedRoles(em: EntityManager): Promise<void> {
  const repo = em.getRepository(AuthRoleEntity);

  for (const roleDef of ROLES) {
    const normalizedName = roleDef.name.toLowerCase();
    const existing = await repo.findOne({ normalizedName } as any);
    if (existing) continue;

    const role = new AuthRoleEntity();
    role.id = roleDef.id;
    role.name = roleDef.name;
    role.normalizedName = normalizedName;
    role.description = roleDef.description;
    role.createdAt = new Date();
    role.updatedAt = new Date();

    em.persist(role);
  }

  await em.flush();
}

async function seedAdminUser(em: EntityManager): Promise<void> {
  const hasher = new Argon2PasswordHasher();
  const normalizedEmail = ADMIN_EMAIL.toLowerCase();

  const repo = em.getRepository(PlaygroundAuthUserEntity);
  const existing = await repo.findOne({ normalizedEmail } as any);
  if (existing) return;

  const user = new PlaygroundAuthUserEntity();
  user.id = ADMIN_ID;
  user.email = ADMIN_EMAIL;
  user.normalizedEmail = normalizedEmail;
  user.passwordHash = await hasher.hash(ADMIN_PASSWORD);
  user.displayName = ADMIN_DISPLAY_NAME;
  user.emailConfirmed = true;
  user.state = "active";
  user.createdAt = new Date();
  user.updatedAt = new Date();

  em.persist(user);
  await em.flush();
}

async function assignAdminRole(em: EntityManager): Promise<void> {
  const userRoleRepo = em.getRepository(AuthUserRoleEntity);

  const existing = await userRoleRepo.findOne({
    userId: ADMIN_ID,
    roleId: ADMIN_ROLE_ID,
  } as any);
  if (existing) return;

  const userRole = new AuthUserRoleEntity();
  userRole.id = deterministicGuid("auth:user-role:admin:admin");
  userRole.userId = ADMIN_ID;
  userRole.roleId = ADMIN_ROLE_ID;
  userRole.roleName = "admin";
  userRole.createdAt = new Date();

  em.persist(userRole);
  await em.flush();
}
