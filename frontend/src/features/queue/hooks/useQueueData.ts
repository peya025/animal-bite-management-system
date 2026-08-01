import { useState, useEffect, useCallback, useRef } from 'react';
import type { QueueEntry, QueueStats } from '../types';
import { fetchQueueData } from '../services';

export function useQueueData(onError?: (msg: string) => void) {
  const [queue, setQueue]         = useState<QueueEntry[]>([]);
  const [stats, setStats]         = useState<QueueStats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [nextEntry, setNextEntry] = useState<QueueEntry | null>(null);

  // Ref keeps onError always current without destabilizing loadData
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    }
    try {
      const data = await fetchQueueData();
      setQueue(data.queue);
      setStats(data.stats);
      setNextEntry(data.nextEntry);
    } catch {
      if (onErrorRef.current && !isSilent) onErrorRef.current('Failed to load queue data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
    const id = setInterval(() => {
      loadData(true);
    }, 30000);
    return () => clearInterval(id);
  }, [loadData]);

  return { queue, stats, loading, nextEntry, reload: () => loadData(false) };
}

