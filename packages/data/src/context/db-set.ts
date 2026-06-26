// file: packages\data\src\context\db-set.ts

import type { IPageRequest, IPageResult, ISortRequest } from "../contracts/pagination.js";

export interface ListOptions<TEntity = unknown> extends ISortRequest<TEntity> {
  limit?: number;
  where?: Partial<TEntity>;
}

export interface DbSet<TEntity extends object, TId = string> {
  list(options?: ListOptions<TEntity>): Promise<TEntity[]>;
  page(options?: IPageRequest<TEntity>): Promise<IPageResult<TEntity>>;
  findById(id: TId): Promise<TEntity | null>;
  findOne(where: Partial<TEntity>): Promise<TEntity | null>;
  exists(where: Partial<TEntity>): Promise<boolean>;
  add(entity: TEntity): Promise<TEntity>;
  update(entity: TEntity): Promise<TEntity>;
  remove(entity: TEntity): Promise<void>;
  removeById(id: TId): Promise<boolean>;
}
