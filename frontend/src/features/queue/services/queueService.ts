import api from '../../../services/api';
import type { QueueEntry, QueueStats } from '../types';

export async function fetchQueueData(): Promise<{
  queue: QueueEntry[];
  stats: QueueStats;
  nextEntry: QueueEntry | null;
}> {
  const [queueRes, statsRes, nextRes] = await Promise.all([
    api.get('/queue'),
    api.get('/queue/statistics'),
    api.get('/queue/next'),
  ]);

  return {
    queue: queueRes.data.queue ?? [],
    stats: statsRes.data,
    nextEntry: nextRes.data.next_patient ?? null,
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
