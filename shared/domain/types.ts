/**
 * Shared Domain Types and Execution Context.
 */

export interface RequestContext {
  readonly userId: string;
  readonly workspaceId?: string | null;
  readonly permissions?: readonly string[];
  readonly roleName?: string | null;
  readonly requestId?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export type SortDirection = 'asc' | 'desc';

export interface SortParams<TField extends string = string> {
  field: TField;
  direction: SortDirection;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
