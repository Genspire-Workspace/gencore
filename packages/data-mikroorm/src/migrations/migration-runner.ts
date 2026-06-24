import type {
  MigrationInfo,
  MigrationResult,
  MigrationRow,
} from "@mikro-orm/migrations";
import { MikroOrmService } from "../extension/mikro-orm-extension.js";
import type {
  MikroOrmMigrationCreateOptions,
  MikroOrmMigrationExecutedOptions,
  MikroOrmMigrationPendingOptions,
  MikroOrmMigrationUpDownOptions,
} from "./migration-options.js";

type MikroOrmLike = {
  getMigrator?: () => {
    create(
      path?: string,
      blank?: boolean,
      initial?: boolean,
      name?: string,
    ): Promise<MigrationResult>;
    getPending(options?: MikroOrmMigrationPendingOptions): Promise<MigrationInfo[]>;
    getExecuted(options?: MikroOrmMigrationExecutedOptions): Promise<MigrationRow[]>;
    up(options?: MikroOrmMigrationUpDownOptions): Promise<MigrationInfo[]>;
    down(options?: MikroOrmMigrationUpDownOptions): Promise<MigrationInfo[]>;
  };
};

export class MikroOrmMigrationRunner {
  constructor(private readonly service: MikroOrmService) {}

  getMigrator() {
    const orm = this.service.getOrm() as MikroOrmLike;

    if (typeof orm.getMigrator !== "function") {
      throw new Error(
        "MikroORM migrator is not available. Make sure @mikro-orm/migrations is installed and Migrator is registered in the MikroORM extensions config.",
      );
    }

    return orm.getMigrator();
  }

  async create(
    options: MikroOrmMigrationCreateOptions = {},
  ): Promise<MigrationResult> {
    return await this.getMigrator().create(
      options.path,
      options.blank,
      options.initial,
      options.name,
    );
  }

  async up(
    options?: MikroOrmMigrationUpDownOptions,
  ): Promise<MigrationInfo[]> {
    return await this.getMigrator().up(options);
  }

  async down(
    options?: MikroOrmMigrationUpDownOptions,
  ): Promise<MigrationInfo[]> {
    return await this.getMigrator().down(options);
  }

  async pending(
    options?: MikroOrmMigrationPendingOptions,
  ): Promise<MigrationInfo[]> {
    return await this.getMigrator().getPending(options);
  }

  async executed(
    options?: MikroOrmMigrationExecutedOptions,
  ): Promise<MigrationRow[]> {
    return await this.getMigrator().getExecuted(options);
  }

  async list(): Promise<{
    executed: MigrationRow[];
    pending: MigrationInfo[];
  }> {
    const [executed, pending] = await Promise.all([
      this.executed(),
      this.pending(),
    ]);

    return {
      executed,
      pending,
    };
  }
}
