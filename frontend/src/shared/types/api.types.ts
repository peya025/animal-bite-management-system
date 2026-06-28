/**
 * API response shape types.
 * Used for typing fetch/axios responses across all features.
 */

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

/** Generic sort direction for table columns. */
export type SortDirection = 'asc' | 'desc';

/** Generic status filter options shared across list pages. */
export type ActiveStatus = 'active' | 'inactive';
