export type SortDirection = "asc" | "desc";

export interface SortRequest<TEntity = unknown> {
  orderBy?: keyof TEntity & string;
  direction?: SortDirection;
}

export interface PageRequest<TEntity = unknown> extends SortRequest<TEntity> {
  page?: number;
  pageSize?: number;
}

export interface PageResult<TEntity> {
  items: TEntity[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
