export interface DataSource {
  name: string;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
}

export class DataSourceRegistry {
  constructor(private readonly sources: readonly DataSource[] = []) {}

  list(): readonly DataSource[] {
    return this.sources;
  }
}
