import type { PageRequest, PageResult } from "./pagination.js";

export interface Repository<
  TEntity,
  TId = string,
  TCreate = unknown,
  TUpdate = Partial<TEntity>,
> {
  findById(id: TId): Promise<TEntity | null>;
  list(input?: unknown): Promise<TEntity[]>;
  page?(input?: PageRequest<TEntity>): Promise<PageResult<TEntity>>;
  create(input: TCreate): Promise<TEntity>;
  updateById(id: TId, input: TUpdate): Promise<TEntity | null>;
  deleteById(id: TId): Promise<boolean>;
}
