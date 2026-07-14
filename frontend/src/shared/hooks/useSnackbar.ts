import { useState, useCallback } from 'react';

export type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
}

export interface UseSnackbarReturn {
  snackbar: SnackbarState;
  /** Show a snackbar message. Defaults to 'success' severity. */
  toast: (message: string, severity?: SnackbarSeverity) => void;
  closeSnackbar: () => void;
}

/**
 * Manages MUI Snackbar state.
 * Returns `snackbar` state to spread onto `<Snackbar>` + `<Alert>`,
 * a `toast()` helper to trigger it, and `closeSnackbar` to dismiss it.
 *
 * @example
 * const { snackbar, toast, closeSnackbar } = useSnackbar();
 *
 * // Trigger:
 * toast('Patient saved!');
 * toast('Something went wrong', 'error');
 *
 * // In JSX:
 * <Snackbar open={snackbar.open} onClose={closeSnackbar} autoHideDuration={4000}>
 *   <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
 * </Snackbar>
 */
export function useSnackbar(): UseSnackbarReturn {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const toast = useCallback((message: string, severity: SnackbarSeverity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const closeSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  return { snackbar, toast, closeSnackbar };
}
