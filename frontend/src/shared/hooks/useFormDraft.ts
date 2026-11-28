import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Status of the most-recent draft save attempt.
 *
 *  idle    — nothing has been saved yet this session (blank form / unmodified)
 *  saving  — debounce timer fired, write in progress
 *  saved   — last write succeeded (timestamp attached)
 *  error   — localStorage write failed (quota exceeded, private browsing, etc.)
 */
export type DraftStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface DraftState {
  /** Current auto-save status to display in the UI */
  status: DraftStatus;
  /** ISO timestamp of the last successful save — undefined when status !== 'saved' */
  savedAt: string | undefined;
  /** Whether a stored draft exists that has not yet been applied */
  hasDraft: boolean;
  /** Call this with the current form data object whenever any field changes */
  saveDraft: (data: unknown) => void;
  /** Clear the stored draft key (call after successful submit or explicit discard) */
  clearDraft: () => void;
  /** Read the stored draft value, or undefined if none exists */
  readDraft: <T>() => T | undefined;
}

const DRAFT_NAMESPACE = 'form_draft__';
const DEBOUNCE_MS = 800;

/**
 * `useFormDraft`
 *
 * Persists form data as a JSON draft in localStorage under a namespaced key.
 * Saves are debounced so we don't hammer storage on every keystroke.
 *
 * @param key    Unique identifier for this form instance, e.g. `"add-patient"` or
 *               `"treatment-${patientId}-${biteId}"`.  Pass `null` or `undefined`
 *               to fully disable drafts (e.g. when a record already exists and is
 *               just being viewed, not edited).
 * @param delay  Debounce delay in ms (default 800).
 *
 * @example
 * const draft = useFormDraft('add-patient');
 *
 * // On mount, restore if a draft exists
 * useEffect(() => {
 *   const saved = draft.readDraft<MyFormData>();
 *   if (saved) setFormData(saved);
 * }, []);
 *
 * // On every change
 * const handleFieldChange = (key) => (e) => {
 *   const next = { ...formData, [key]: e.target.value };
 *   setFormData(next);
 *   draft.saveDraft(next);
 * };
 *
 * // On successful submit
 * draft.clearDraft();
 */
export function useFormDraft(
  key: string | null | undefined,
  delay: number = DEBOUNCE_MS,
): DraftState {
  const storageKey = key ? `${DRAFT_NAMESPACE}${key}` : null;

  const [status, setStatus] = useState<DraftStatus>('idle');
  const [savedAt, setSavedAt] = useState<string | undefined>(undefined);
  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    if (!storageKey) return false;
    try {
      return localStorage.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a stable ref to the latest storageKey so the debounced callback
  // always uses the current key even if it changes mid-render.
  const storageKeyRef = useRef(storageKey);
  useEffect(() => {
    storageKeyRef.current = storageKey;
  }, [storageKey]);

  // When the key changes (e.g. a modal closes and reopens for a different record)
  // reset status and re-check for an existing draft.
  useEffect(() => {
    setStatus('idle');
    setSavedAt(undefined);
    if (storageKey) {
      try {
        setHasDraft(localStorage.getItem(storageKey) !== null);
      } catch {
        setHasDraft(false);
      }
    } else {
      setHasDraft(false);
    }
  }, [storageKey]);

  /** Schedule a debounced localStorage write */
  const saveDraft = useCallback(
    (data: unknown) => {
      if (!storageKeyRef.current) return;

      // Cancel any pending write
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }

      setStatus('saving');

      timerRef.current = setTimeout(() => {
        const k = storageKeyRef.current;
        if (!k) return;
        try {
          localStorage.setItem(
            k,
            JSON.stringify({ data, savedAt: new Date().toISOString() }),
          );
          const ts = new Date().toISOString();
          setStatus('saved');
          setSavedAt(ts);
          setHasDraft(true);
        } catch {
          // Storage full or unavailable — keep the form data in React state,
          // just report the error so the UI can show a warning.
          setStatus('error');
        }
        timerRef.current = null;
      }, delay);
    },
    [delay],
  );

  /** Immediately remove the draft from storage */
  const clearDraft = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const k = storageKeyRef.current;
    if (!k) return;
    try {
      localStorage.removeItem(k);
    } catch {
      // ignore — if we can't remove it, it will just be overwritten next time
    }
    setStatus('idle');
    setSavedAt(undefined);
    setHasDraft(false);
  }, []);

  /** Read the stored draft without side-effects */
  const readDraft = useCallback(<T>(): T | undefined => {
    const k = storageKeyRef.current;
    if (!k) return undefined;
    try {
      const raw = localStorage.getItem(k);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as { data: T; savedAt: string };
      return parsed.data;
    } catch {
      return undefined;
    }
  }, []);

  // Cleanup pending timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { status, savedAt, hasDraft, saveDraft, clearDraft, readDraft };
}
