import api from '../../../shared/services/api';
import type { QueueEntry, QueueStats, QueueHistoryEntry } from '../types';

// ── Fetch main + second chance queues ────────────────────────────────────────
export async function fetchQueueData(): Promise<{
  queue: QueueEntry[];
  secondChanceQueue: QueueEntry[];
  stats: QueueStats;
  nextEntry: QueueEntry | null;
}> {
  const { data } = await api.get('/queue');
  const empty: QueueStats = {
    total: 0, waiting: 0, called: 0, in_consultation: 0, serving: 0,
    completed: 0, cancelled: 0, no_response: 0,
    second_chance: 0, final_recall: 0, absent: 0,
  };
  return {
    queue:             data.queue              ?? [],
    secondChanceQueue: data.second_chance_queue ?? [],
    stats:             data.stats              ?? empty,
    nextEntry:         data.next_patient        ?? null,
  };
}

// ── Main queue actions ────────────────────────────────────────────────────────
export const callNext              = () => api.post('/queue/call-next');
export const callQueuePatient        = (id: number) => api.post(`/queue/${id}/call`);
export const serveQueuePatient       = (id: number) => api.post(`/queue/${id}/serve`);
export const markNoResponse          = (id: number) => api.post(`/queue/${id}/no-response`);
export const recallQueuePatient      = (id: number) => api.post(`/queue/${id}/recall`);
export const markAbsent              = (id: number) => api.post(`/queue/${id}/absent`);
export const cancelQueueEntry        = (id: number) => api.post(`/queue/${id}/cancel`);
export const updateQueuePriority     = (id: number, priority: string) => api.put(`/queue/${id}/priority`, { priority });
export const trashQueueEntry         = (id: number) => api.delete(`/queue/${id}`);
export const restoreQueueEntry       = (id: number) => api.post(`/queue/${id}/restore`);

export const completeQueueConsultation = (id: number, notes?: string) =>
  api.post(`/queue/${id}/complete`, { consultation_notes: notes || undefined });

// ── History ──────────────────────────────────────────────────────────────────
export async function fetchQueueHistory(id: number): Promise<QueueHistoryEntry[]> {
  const { data } = await api.get(`/queue/${id}/history`);
  return data ?? [];
}

// ── Trash bin listing ────────────────────────────────────────────────────────
export async function fetchTrashedEntries(date?: string): Promise<QueueEntry[]> {
  const { data } = await api.get('/queue/trashed', { params: date ? { date } : {} });
  return data ?? [];
}
