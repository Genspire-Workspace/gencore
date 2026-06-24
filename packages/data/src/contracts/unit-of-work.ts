export interface IUnitOfWork {
  run<T>(operation: () => Promise<T>): Promise<T>;
}
