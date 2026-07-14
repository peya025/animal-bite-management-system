import { useState, useCallback } from 'react';

/**
 * Manages a generic key/value filter record.
 * Provides helpers to set individual filters, reset all, and read
 * only the filters that have non-empty values (for building API params).
 *
 * @param initial - Optional initial filter values
 *
 * @example
 * const { filters, setFilter, resetFilters, activeFilters } = useFilters({
 *   search: '',
 *   status: '',
 *   priority: '',
 * });
 */
export function useFilters<T extends Record<string, string>>(initial: T) {
  const [filters, setFilters] = useState<T>(initial);

  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initial);
  }, [initial]);

  /** Returns only filters with a non-empty string value. */
  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== ''),
  ) as Partial<T>;

  return { filters, setFilter, resetFilters, activeFilters };
}
