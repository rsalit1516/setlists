/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  isSuccess: boolean;
  data?: T;
  errorMessage?: string;
  statusCode: number;
}

/**
 * Paginated result interface
 */
export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
