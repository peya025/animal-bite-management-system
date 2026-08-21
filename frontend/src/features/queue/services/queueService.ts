import api from '../../../services/api';
import type { QueueEntry, QueueStats } from '../types';

export async function fetchQueueData(): Promise<{
  queue: QueueEntry[];
  stats: QueueStats;
  nextEntry: QueueEntry | null;
}> {
  const response = await api.get('/queue');
  return {
    queue: response.data.queue ?? [],
    stats: response.data.stats ?? {
      date: new Date().toISOString().split('T')[0],
      total: 0,
      waiting: 0,
      in_consultation: 0,
      completed: 0,
      cancelled: 0,
      no_response: 0,
      by_visit_type: {},
    },
    nextEntry: response.data.next_patient ?? null,
  };
}

export async function callQueuePatient(queueId: number) {
  return api.post(`/queue/${queueId}/call`);
}

export async function cancelQueueEntry(queueId: number) {
  return api.post(`/queue/${queueId}/cancel`);
}

export async function completeQueueConsultation(queueId: number, consultationNotes?: string) {
  return api.post(`/queue/${queueId}/complete`, {
    consultation_notes: consultationNotes || undefined,
  });
}

export async function markNoResponse(queueId: number) {
  return api.post(`/queue/${queueId}/no-response`);
}

export async function giveSecondChance(queueId: number) {
  return api.post(`/queue/${queueId}/second-chance`);
}

export async function updateQueuePriority(queueId: number, priority: 'normal' | 'urgent' | 'emergency') {
  return api.put(`/queue/${queueId}/priority`, { priority });
}

export async function trashQueueEntry(queueId: number) {
  return api.delete(`/queue/${queueId}`);
}

export async function fetchTrashedEntries(date?: string): Promise<QueueEntry[]> {
  const response = await api.get('/queue/trashed', { params: date ? { date } : {} });
  return response.data ?? [];
}

export async function restoreQueueEntry(queueId: number) {
  return api.post(`/queue/${queueId}/restore`);
}
