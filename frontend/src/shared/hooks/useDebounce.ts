import { useState, useEffect } from 'react';

/**
 * Delays updating a value until after a specified wait period.
 * Useful for search inputs to avoid firing a request on every keystroke.
 *
 * @param value   - The value to debounce
 * @param delay   - Milliseconds to wait (default 350ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
