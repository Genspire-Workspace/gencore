// file: packages\data\src\contracts\pagination.ts

export type SortDirection = "asc" | "desc";

export interface ISortRequest<TEntity = unknown> {
  orderBy?: keyof TEntity & string;
  direction?: SortDirection;
}

export interface IPageRequest<TEntity = unknown> extends ISortRequest<TEntity> {
  page?: number;
  pageSize?: number;
}

export interface IPageResult<TEntity> {
  items: TEntity[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
