export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedList<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export function createPaginatedList<T>(
  items: T[],
  total: number,
  page = 1,
  pageSize = items.length || 10
): PaginatedList<T> {
  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}
