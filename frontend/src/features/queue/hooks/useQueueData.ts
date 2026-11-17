import { useState, useEffect, useCallback, useRef } from 'react';
import type { QueueEntry, QueueStats } from '../types';
import { fetchQueueData } from '../services';
import { useAuth } from '../../../contexts/AuthContext';
import { useEcho } from '../../../shared/hooks/useEcho';

const FAST_FALLBACK_POLL_MS = 30_000;
const CONNECTED_HEARTBEAT_MS = 60_000;

export function useQueueData(onError?: (msg: string) => void) {
  const [queue,             setQueue]             = useState<QueueEntry[]>([]);
  const [secondChanceQueue, setSecondChanceQueue] = useState<QueueEntry[]>([]);
  const [stats,             setStats]             = useState<QueueStats | null>(null);
  const [loading,           setLoading]           = useState(true);
  const [nextEntry,         setNextEntry]         = useState<QueueEntry | null>(null);

  const { user, clinic } = useAuth();
  const { echo, isConnected } = useEcho();
  const clinicId = clinic?.id ?? user?.clinic_id ?? null;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasConnectedRef = useRef<boolean>(false);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await fetchQueueData();
      setQueue(data.queue);
      setSecondChanceQueue(data.secondChanceQueue);
      setStats(data.stats);
      setNextEntry(data.nextEntry);
    } catch {
      if (onErrorRef.current && !isSilent) onErrorRef.current('Failed to load queue data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Coalesce rapid event broadcasts into a single silent fetch
  const scheduleSilentReload = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      void loadData(true);
      debounceTimerRef.current = null;
    }, 200);
  }, [loadData]);

  // Initial fetch on mount
  useEffect(() => {
    loadData(false);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [loadData]);

  // Reconnection recovery: when transitioning to connected, refresh immediately
  useEffect(() => {
    if (isConnected && !wasConnectedRef.current) {
      void loadData(true);
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected, loadData]);

  // Adaptive polling fallback
  useEffect(() => {
    const pollInterval = isConnected ? CONNECTED_HEARTBEAT_MS : FAST_FALLBACK_POLL_MS;
    const intervalId = setInterval(() => {
      void loadData(true);
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [isConnected, loadData]);

  // Real-time WebSocket subscription
  useEffect(() => {
    if (!echo || !clinicId) return;

    const channelName = `clinic.${clinicId}.queue`;
    let channel: any;

    const handleQueueEvent = () => {
      scheduleSilentReload();
    };

    try {
      channel = echo.private(channelName);
      channel.listen('.queue.updated', handleQueueEvent);
      channel.listen('.appointment.changed', handleQueueEvent);
    } catch (err) {
      console.warn('[Echo] Failed to subscribe to queue channel:', err);
    }

    return () => {
      if (channel) {
        try {
          channel.stopListening('.queue.updated', handleQueueEvent);
          channel.stopListening('.appointment.changed', handleQueueEvent);
        } catch {
          // Ignore unbind errors
        }
      }
    };
  }, [echo, clinicId, scheduleSilentReload]);

  return {
    queue,
    secondChanceQueue,
    stats,
    loading,
    nextEntry,
    reload: () => loadData(false),
  };
}
