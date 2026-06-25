export interface IPlaygroundSeedRoleDefinition {
  name: string;
  description?: string | null;
}

export interface IPlaygroundSeedAdminDefinition {
  enabled: boolean;
  email: string;
  password: string;
  displayName: string;
  roles: string[];
  overwritePassword: boolean;
}

export interface IPlaygroundSeedEnv {
  enabled: boolean;
  roles: IPlaygroundSeedRoleDefinition[];
  admin: IPlaygroundSeedAdminDefinition;
}

export interface IPlaygroundAuthEnv {
  jwtSecret: string;
  issuer: string;
  audience: string;
}

export interface IPlaygroundDatabaseEnv {
  provider: "libsql" | "postgres";
  libsqlDbPath: string;
  postgresUrl: string;
  schemaMode: "update" | "migrations" | "none";
}

export interface IPlaygroundS3StorageEnv {
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  defaultBucket: string;
  publicBaseUrl?: string;
}

export interface IPlaygroundStorageEnv {
  provider: "local" | "s3";
  localRoot: string;
  publicBaseUrl?: string;
  s3: IPlaygroundS3StorageEnv;
}

export interface IPlaygroundEnv {
  port: number;
  database: IPlaygroundDatabaseEnv;
  auth: IPlaygroundAuthEnv;
  storage: IPlaygroundStorageEnv;
  seed: IPlaygroundSeedEnv;
}

function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const lower = value.trim().toLowerCase();
  if (lower === "true" || lower === "1" || lower === "yes") return true;
  if (lower === "false" || lower === "0" || lower === "no") return false;
  return undefined;
}

function requireString(value: string | undefined, name: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
}

function parseRoles(raw: string | undefined): IPlaygroundSeedRoleDefinition[] {
  if (!raw || raw.trim().length === 0) {
    return [];
  }

  return raw
    .split(";")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      const colonIndex = segment.indexOf(":");
      if (colonIndex === -1) {
        return { name: segment, description: null };
      }
      return {
        name: segment.substring(0, colonIndex).trim(),
        description: segment.substring(colonIndex + 1).trim() || null,
      };
    });
}

function parseAdminRoles(raw: string | undefined): string[] {
  if (!raw || raw.trim().length === 0) {
    return [];
  }

  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

export function readPlaygroundEnv(
  env: Record<string, string | undefined>,
): IPlaygroundEnv {
  const portRaw = env["PORT"];
  const port = portRaw ? parseInt(portRaw, 10) : 3000;

  const databaseProvider = env["GENCORE_PLAYGROUND_DATABASE_PROVIDER"]?.trim() ?? "libsql";
  if (databaseProvider !== "libsql" && databaseProvider !== "postgres") {
    throw new Error(
      `Invalid GENCORE_PLAYGROUND_DATABASE_PROVIDER: '${databaseProvider}'. Expected 'libsql' or 'postgres'.`,
    );
  }

  const schemaMode = env["GENCORE_PLAYGROUND_SCHEMA_MODE"]?.trim() ?? "update";
  if (schemaMode !== "update" && schemaMode !== "migrations" && schemaMode !== "none") {
    throw new Error(
      `Invalid GENCORE_PLAYGROUND_SCHEMA_MODE: '${schemaMode}'. Expected 'update', 'migrations', or 'none'.`,
    );
  }

  const storageProvider = env["GENCORE_PLAYGROUND_STORAGE_PROVIDER"]?.trim() ?? "local";
  if (storageProvider !== "local" && storageProvider !== "s3") {
    throw new Error(
      `Invalid GENCORE_PLAYGROUND_STORAGE_PROVIDER: '${storageProvider}'. Expected 'local' or 's3'.`,
    );
  }

  const s3Region = env["GENCORE_PLAYGROUND_STORAGE_S3_REGION"]?.trim() ?? "us-east-1";
  const s3AccessKeyId = env["GENCORE_PLAYGROUND_STORAGE_S3_ACCESS_KEY_ID"]?.trim() ?? "";
  const s3SecretAccessKey = env["GENCORE_PLAYGROUND_STORAGE_S3_SECRET_ACCESS_KEY"]?.trim() ?? "";
  const s3ForcePathStyle = parseBool(env["GENCORE_PLAYGROUND_STORAGE_S3_FORCE_PATH_STYLE"]) ?? true;
  const s3DefaultBucket = env["GENCORE_PLAYGROUND_STORAGE_S3_DEFAULT_BUCKET"]?.trim() ?? "playground";
  const s3PublicBaseUrl = env["GENCORE_PLAYGROUND_STORAGE_S3_PUBLIC_BASE_URL"]?.trim() || undefined;
  const s3Endpoint = env["GENCORE_PLAYGROUND_STORAGE_S3_ENDPOINT"]?.trim() || undefined;

  if (storageProvider === "s3") {
    requireString(s3AccessKeyId, "GENCORE_PLAYGROUND_STORAGE_S3_ACCESS_KEY_ID");
    requireString(s3SecretAccessKey, "GENCORE_PLAYGROUND_STORAGE_S3_SECRET_ACCESS_KEY");
  }

  const seedEnabled = parseBool(env["GENCORE_PLAYGROUND_SEED_ENABLED"]) ?? true;
  const seedAdminEnabled = parseBool(env["GENCORE_PLAYGROUND_SEED_ADMIN_ENABLED"]) ?? true;
  const seedAdminOverwritePassword = parseBool(env["GENCORE_PLAYGROUND_SEED_ADMIN_OVERWRITE_PASSWORD"]) ?? false;

  return {
    port,
    database: {
      provider: databaseProvider,
      libsqlDbPath: env["GENCORE_PLAYGROUND_LIBSQL_DB_PATH"]?.trim() || "./data/playground/playground.db",
      postgresUrl: env["GENCORE_PLAYGROUND_POSTGRES_URL"]?.trim() || "postgresql://gencore:gencore@localhost:5432/gencore_playground",
      schemaMode,
    },
    auth: {
      jwtSecret: env["GENCORE_AUTH_JWT_SECRET"]?.trim() || "dev-playground-secret-change-me",
      issuer: env["GENCORE_AUTH_ISSUER"]?.trim() || "gencore-playground-api",
      audience: env["GENCORE_AUTH_AUDIENCE"]?.trim() || "gencore-playground",
    },
    storage: {
      provider: storageProvider,
      localRoot: env["GENCORE_PLAYGROUND_STORAGE_LOCAL_ROOT"]?.trim() || "./data/storage",
      publicBaseUrl: env["GENCORE_PLAYGROUND_STORAGE_PUBLIC_BASE_URL"]?.trim() || undefined,
      s3: {
        endpoint: s3Endpoint,
        region: s3Region,
        accessKeyId: s3AccessKeyId,
        secretAccessKey: s3SecretAccessKey,
        forcePathStyle: s3ForcePathStyle,
        defaultBucket: s3DefaultBucket,
        publicBaseUrl: s3PublicBaseUrl,
      },
    },
    seed: {
      enabled: seedEnabled,
      roles: parseRoles(env["GENCORE_PLAYGROUND_SEED_ROLES"]),
      admin: {
        enabled: seedAdminEnabled,
        email: env["GENCORE_PLAYGROUND_SEED_ADMIN_EMAIL"]?.trim() || "admin@admin.com",
        password: env["GENCORE_PLAYGROUND_SEED_ADMIN_PASSWORD"]?.trim() || "@Dmin123!",
        displayName: env["GENCORE_PLAYGROUND_SEED_ADMIN_DISPLAY_NAME"]?.trim() || "Admin",
        roles: parseAdminRoles(env["GENCORE_PLAYGROUND_SEED_ADMIN_ROLES"]),
        overwritePassword: seedAdminOverwritePassword,
      },
    },
  };
}
