// file: packages\data\src\context\db-context.ts

export interface DbContext {
  saveChanges(): Promise<void>;
  transaction<T>(operation: () => Promise<T>): Promise<T>;
}
