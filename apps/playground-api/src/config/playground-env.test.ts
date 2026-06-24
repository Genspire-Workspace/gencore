import { describe, expect, test } from "bun:test";
import { readPlaygroundEnv, type IPlaygroundEnv } from "./playground-env.js";

describe("readPlaygroundEnv", () => {
  test("default local env parses", () => {
    const env = readPlaygroundEnv({});
    expect(env.database.provider).toBe("libsql");
    expect(env.storage.provider).toBe("local");
    expect(env.seed.enabled).toBe(true);
    expect(env.seed.admin.enabled).toBe(true);
    expect(env.port).toBe(3000);
  });

  test("docker env parses postgres + s3", () => {
    const env = readPlaygroundEnv({
      GENCORE_PLAYGROUND_DATABASE_PROVIDER: "postgres",
      GENCORE_PLAYGROUND_POSTGRES_URL: "postgresql://u:p@host:5432/db",
      GENCORE_PLAYGROUND_SCHEMA_MODE: "migrations",
      GENCORE_PLAYGROUND_STORAGE_PROVIDER: "s3",
      GENCORE_PLAYGROUND_STORAGE_S3_REGION: "eu-west-1",
      GENCORE_PLAYGROUND_STORAGE_S3_ACCESS_KEY_ID: "my-key",
      GENCORE_PLAYGROUND_STORAGE_S3_SECRET_ACCESS_KEY: "my-secret",
      GENCORE_PLAYGROUND_STORAGE_S3_DEFAULT_BUCKET: "my-bucket",
    });

    expect(env.database.provider).toBe("postgres");
    expect(env.database.postgresUrl).toBe("postgresql://u:p@host:5432/db");
    expect(env.database.schemaMode).toBe("migrations");
    expect(env.storage.provider).toBe("s3");
    expect(env.storage.s3.region).toBe("eu-west-1");
    expect(env.storage.s3.accessKeyId).toBe("my-key");
    expect(env.storage.s3.secretAccessKey).toBe("my-secret");
    expect(env.storage.s3.defaultBucket).toBe("my-bucket");
  });

  test("invalid database provider throws", () => {
    expect(() =>
      readPlaygroundEnv({ GENCORE_PLAYGROUND_DATABASE_PROVIDER: "mysql" }),
    ).toThrow("Invalid GENCORE_PLAYGROUND_DATABASE_PROVIDER");
  });

  test("invalid storage provider throws", () => {
    expect(() =>
      readPlaygroundEnv({ GENCORE_PLAYGROUND_STORAGE_PROVIDER: "ftp" }),
    ).toThrow("Invalid GENCORE_PLAYGROUND_STORAGE_PROVIDER");
  });

  test("roles parse correctly", () => {
    const env = readPlaygroundEnv({
      GENCORE_PLAYGROUND_SEED_ROLES: "admin:Full access.;member:Standard user.",
    });

    expect(env.seed.roles).toEqual([
      { name: "admin", description: "Full access." },
      { name: "member", description: "Standard user." },
    ]);
  });

  test("empty roles returns empty array", () => {
    const env = readPlaygroundEnv({ GENCORE_PLAYGROUND_SEED_ROLES: "" });
    expect(env.seed.roles).toEqual([]);
  });

  test("roles without descriptions work", () => {
    const env = readPlaygroundEnv({ GENCORE_PLAYGROUND_SEED_ROLES: "admin;member" });
    expect(env.seed.roles).toEqual([
      { name: "admin", description: null },
      { name: "member", description: null },
    ]);
  });

  test("admin roles parse from comma-separated", () => {
    const env = readPlaygroundEnv({
      GENCORE_PLAYGROUND_SEED_ADMIN_ROLES: "admin,member,super",
    });
    expect(env.seed.admin.roles).toEqual(["admin", "member", "super"]);
  });

  test("admin roles are lowercased", () => {
    const env = readPlaygroundEnv({
      GENCORE_PLAYGROUND_SEED_ADMIN_ROLES: "Admin,Member",
    });
    expect(env.seed.admin.roles).toEqual(["admin", "member"]);
  });

  test("booleans parse correctly", () => {
    let env = readPlaygroundEnv({
      GENCORE_PLAYGROUND_SEED_ENABLED: "false",
      GENCORE_PLAYGROUND_SEED_ADMIN_ENABLED: "0",
      GENCORE_PLAYGROUND_SEED_ADMIN_OVERWRITE_PASSWORD: "yes",
    });
    expect(env.seed.enabled).toBe(false);
    expect(env.seed.admin.enabled).toBe(false);
    expect(env.seed.admin.overwritePassword).toBe(true);

    env = readPlaygroundEnv({
      GENCORE_PLAYGROUND_SEED_ENABLED: "True",
      GENCORE_PLAYGROUND_SEED_ADMIN_ENABLED: "1",
      GENCORE_PLAYGROUND_SEED_ADMIN_OVERWRITE_PASSWORD: "no",
    });
    expect(env.seed.enabled).toBe(true);
    expect(env.seed.admin.enabled).toBe(true);
    expect(env.seed.admin.overwritePassword).toBe(false);
  });

  test("port is parsed from env", () => {
    const env = readPlaygroundEnv({ PORT: "4000" });
    expect(env.port).toBe(4000);
  });

  test("schema mode invalid throws", () => {
    expect(() =>
      readPlaygroundEnv({ GENCORE_PLAYGROUND_SCHEMA_MODE: "invalid" }),
    ).toThrow("Invalid GENCORE_PLAYGROUND_SCHEMA_MODE");
  });
});
