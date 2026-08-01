import { useState, useEffect, useCallback } from 'react';
import type { QueueEntry, QueueStats } from '../types';
import { fetchQueueData } from '../services';

export function useQueueData(onError?: (msg: string) => void) {
  const [queue, setQueue]         = useState<QueueEntry[]>([]);
  const [stats, setStats]         = useState<QueueStats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [nextEntry, setNextEntry] = useState<QueueEntry | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchQueueData();
      setQueue(data.queue);
      setStats(data.stats);
      setNextEntry(data.nextEntry);
    } catch {
      if (onError) onError('Failed to load queue data');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 30000);
    return () => clearInterval(id);
  }, [loadData]);

  return { queue, stats, loading, nextEntry, reload: loadData };
}
