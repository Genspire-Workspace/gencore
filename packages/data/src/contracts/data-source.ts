export interface IDataSource {
  name: string;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
}

export class DataSourceRegistry {
  constructor(private readonly sources: readonly IDataSource[] = []) {}

  list(): readonly IDataSource[] {
    return this.sources;
  }
}
