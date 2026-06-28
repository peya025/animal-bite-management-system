import { useState, useCallback, useRef } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string;
}

export interface UseAsyncReturn<T> extends AsyncState<T> {
  /**
   * Execute the async function.
   * Handles loading/error state automatically.
   * Ignores the result if the component has unmounted.
   */
  execute: () => Promise<void>;
}

/**
 * Manages the common loading / error / data state pattern for async operations.
 *
 * @param fn - An async function that returns T
 * @param initialData - Optional initial data value
 *
 * @example
 * const { data, loading, error, execute } = useAsync(() =>
 *   api.get('/patients').then(r => r.data)
 * );
 *
 * useEffect(() => { execute(); }, [execute]);
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  initialData: T | null = null,
): UseAsyncReturn<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: true,
    error: '',
  });

  // Track mount state to prevent setState on unmounted components
  const mountedRef = useRef(true);
  useState(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await fn();
      if (mountedRef.current) {
        setState({ data, loading: false, error: '' });
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred';
        setState(prev => ({ ...prev, loading: false, error: message }));
      }
    }
  }, [fn]);

  return { ...state, execute };
}
