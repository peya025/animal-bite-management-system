import api from '../../../services/api';
import type { QueueEntry, QueueStats } from '../types';

export async function fetchQueueData(): Promise<{
  queue: QueueEntry[];
  stats: QueueStats;
  nextEntry: QueueEntry | null;
}> {
  // Single API call - backend returns everything
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
