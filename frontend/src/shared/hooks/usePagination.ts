import { useState, useCallback } from 'react';

export interface PaginationState {
  page: number;          // 0-indexed (MUI style)
  rowsPerPage: number;
  setPage: (page: number) => void;
  setRowsPerPage: (rows: number) => void;
  resetPage: () => void;
}

/**
 * Manages MUI-style (0-indexed) pagination state.
 * Resets to page 0 whenever rowsPerPage changes.
 *
 * @param initialRowsPerPage - Rows per page to start with (default 10)
 */
export function usePagination(initialRowsPerPage = 10): PaginationState {
  const [page, setPageRaw] = useState(0);
  const [rowsPerPage, setRowsPerPageRaw] = useState(initialRowsPerPage);

  const setPage = useCallback((p: number) => setPageRaw(p), []);

  const setRowsPerPage = useCallback((rows: number) => {
    setRowsPerPageRaw(rows);
    setPageRaw(0);
  }, []);

  const resetPage = useCallback(() => setPageRaw(0), []);

  return { page, rowsPerPage, setPage, setRowsPerPage, resetPage };
}
