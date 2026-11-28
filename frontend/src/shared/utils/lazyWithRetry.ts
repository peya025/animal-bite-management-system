import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const CHUNK_RELOAD_STORAGE_KEY = 'abtc:chunk-reload-at';
const CHUNK_RELOAD_COOLDOWN_MS = 15_000;

const CHUNK_ERROR_PATTERNS = [
  'failed to fetch dynamically imported module',
  'importing a module script failed',
  'error loading dynamically imported module',
  'loading chunk',
  'loading css chunk',
  'chunkloaderror',
];

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? `${error.name} ${error.message}`
        : String(error);
  const normalized = message.toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/**
 * Reloads the page at most once per cooldown window when a stale lazy-loaded
 * chunk fails to fetch (typically right after a new Vercel deployment).
 * Returns true if a reload was triggered.
 */
export function reloadOnceForChunkError(): boolean {
  try {
    const now = Date.now();
    const lastReloadRaw = window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY);
    const lastReload = lastReloadRaw ? Number(lastReloadRaw) : 0;

    if (!Number.isFinite(lastReload) || now - lastReload > CHUNK_RELOAD_COOLDOWN_MS) {
      window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now));
      window.location.reload();
      return true;
    }
  } catch {
    // Ignore storage errors (e.g., private browsing restrictions)
  }
  return false;
}

/**
 * Drop-in replacement for React.lazy that automatically reloads once to fetch
 * fresh assets when a stale deployment chunk fails to load.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await importer();
    } catch (error) {
      if (isChunkLoadError(error) && reloadOnceForChunkError()) {
        // Keep Suspense fallback visible while the browser reloads
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}
