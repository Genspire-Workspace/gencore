import type { MigrateOptions, MigrationInfo, MigrationResult, MigrationRow } from "@mikro-orm/migrations";

export type MikroOrmMigrationCreateOptions = {
  blank?: boolean;
  initial?: boolean;
  name?: string;
  path?: string;
};

export type MikroOrmMigrationUpDownOptions = string | string[] | MigrateOptions;

export type MikroOrmMigrationPendingOptions = {
  schema?: string;
};

export type MikroOrmMigrationExecutedOptions = {
  schema?: string;
};

export type {
  MigrateOptions,
  MigrationInfo,
  MigrationResult,
  MigrationRow,
};
