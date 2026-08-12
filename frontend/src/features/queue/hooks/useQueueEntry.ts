import { useState, useEffect, useCallback } from 'react';
import api from '../../../shared/services/api';
import type { QueueEntry } from '../types';

interface UseQueueEntryResult {
  entry: QueueEntry | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useQueueEntry(queueId: string | number | undefined): UseQueueEntryResult {
  const [entry, setEntry]   = useState<QueueEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!queueId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/queue/${queueId}`);
      setEntry(res.data);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to load queue entry');
    } finally {
      setLoading(false);
    }
  }, [queueId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { entry, loading, error, reload: fetch };
}
