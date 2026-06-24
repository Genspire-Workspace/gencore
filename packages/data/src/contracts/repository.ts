import type { IPageRequest, IPageResult } from "./pagination.js";

export interface IRepository<
  TEntity,
  TId = string,
  TCreate = unknown,
  TUpdate = Partial<TEntity>,
> {
  findById(id: TId): Promise<TEntity | null>;
  list(input?: unknown): Promise<TEntity[]>;
  page?(input?: IPageRequest<TEntity>): Promise<IPageResult<TEntity>>;
  create(input: TCreate): Promise<TEntity>;
  updateById(id: TId, input: TUpdate): Promise<TEntity | null>;
  deleteById(id: TId): Promise<boolean>;
}
