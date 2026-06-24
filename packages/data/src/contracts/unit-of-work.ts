// file: packages\data\src\contracts\unit-of-work.ts

export interface IUnitOfWork {
  run<T>(operation: () => Promise<T>): Promise<T>;
}
