// file: apps\playground-api\src\auth\auth-seeder.ts

import type { EntityManager } from "@mikro-orm/core";
import { deterministicGuid } from "@genspire/core";
import {
  Argon2PasswordHasher,
  AuthRoleEntity,
  AuthUserRoleEntity,
} from "@genspire/auth";
import type { MikroOrmSeeder } from "@genspire/data-mikroorm";
import type { IPlaygroundEnv } from "../config/playground-env.js";
import { PlaygroundAuthUserEntity } from "./playground-auth-user.entity.js";

export interface IPlaygroundAuthSeederOptions {
  env: IPlaygroundEnv;
}

function roleId(name: string): string {
  return deterministicGuid(`auth:role:${name.toLowerCase()}`);
}

function userId(email: string): string {
  return deterministicGuid(`auth:user:${email.toLowerCase()}`);
}

function userRoleId(userId: string, roleName: string): string {
  return deterministicGuid(`auth:user-role:${userId}:${roleName.toLowerCase()}`);
}

export function createPlaygroundAuthSeeder(
  options: IPlaygroundAuthSeederOptions,
): MikroOrmSeeder {
  const seedEnv = options.env.seed;

  return {
    name: "playground-auth-seeder",

    async run(em: EntityManager): Promise<void> {
      if (!seedEnv.enabled) {
        return;
      }

      await seedRoles(em, seedEnv.roles);
      await seedAdminUser(em, seedEnv.admin);
    },
  };
}

async function seedRoles(
  em: EntityManager,
  roles: IPlaygroundEnv["seed"]["roles"],
): Promise<void> {
  if (roles.length === 0) {
    return;
  }

  const repo = em.getRepository(AuthRoleEntity);

  for (const roleDef of roles) {
    const normalizedName = roleDef.name.toLowerCase();

    const existing = await repo.findOne({ normalizedName } as any);
    if (existing) {
      if (roleDef.description !== undefined && existing.description !== roleDef.description) {
        existing.description = roleDef.description;
        existing.updatedAt = new Date();
        em.persist(existing);
      }
      continue;
    }

    const role = new AuthRoleEntity();
    role.id = roleId(roleDef.name);
    role.name = roleDef.name;
    role.normalizedName = normalizedName;
    role.description = roleDef.description ?? null;
    role.createdAt = new Date();
    role.updatedAt = new Date();

    em.persist(role);
  }

  await em.flush();
}

async function seedAdminUser(
  em: EntityManager,
  admin: IPlaygroundEnv["seed"]["admin"],
): Promise<void> {
  if (!admin.enabled) {
    return;
  }

  const hasher = new Argon2PasswordHasher();
  const normalizedEmail = admin.email.toLowerCase();

  const repo = em.getRepository(PlaygroundAuthUserEntity);
  const existing = await repo.findOne({ normalizedEmail } as any);

  if (existing) {
    let changed = false;

    if (existing.displayName !== admin.displayName) {
      existing.displayName = admin.displayName;
      changed = true;
    }

    if (!existing.emailConfirmed) {
      existing.emailConfirmed = true;
      changed = true;
    }

    if (existing.state !== "active") {
      existing.state = "active";
      changed = true;
    }

    if (admin.overwritePassword) {
      const newHash = await hasher.hash(admin.password);
      if (existing.passwordHash !== newHash) {
        existing.passwordHash = newHash;
        changed = true;
      }
    }

    if (changed) {
      existing.updatedAt = new Date();
      em.persist(existing);
      await em.flush();
    }
  } else {
    const user = new PlaygroundAuthUserEntity();
    user.id = userId(admin.email);
    user.email = admin.email;
    user.normalizedEmail = normalizedEmail;
    user.passwordHash = await hasher.hash(admin.password);
    user.displayName = admin.displayName;
    user.emailConfirmed = true;
    user.state = "active";
    user.createdAt = new Date();
    user.updatedAt = new Date();

    em.persist(user);
    await em.flush();
  }

  await assignAdminRoles(em, userId(admin.email), admin.roles);
}

async function assignAdminRoles(
  em: EntityManager,
  uid: string,
  roleNames: string[],
): Promise<void> {
  if (roleNames.length === 0) {
    return;
  }

  const userRoleRepo = em.getRepository(AuthUserRoleEntity);

  for (const roleName of roleNames) {
    const normalizedName = roleName.toLowerCase();

    const existing = await userRoleRepo.findOne({
      userId: uid,
      roleName: normalizedName,
    } as any);
    if (existing) {
      continue;
    }

    const userRole = new AuthUserRoleEntity();
    userRole.id = userRoleId(uid, roleName);
    userRole.userId = uid;
    userRole.roleId = roleId(roleName);
    userRole.roleName = normalizedName;
    userRole.createdAt = new Date();

    em.persist(userRole);
  }

  await em.flush();
}
