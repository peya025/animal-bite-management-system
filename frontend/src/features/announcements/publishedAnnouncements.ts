import { API_BASE_URL } from '../../shared/services/api';
import type { Announcement } from './types';

export async function getPublishedAnnouncements(signal: AbortSignal): Promise<Announcement[]> {
  const response = await fetch(`${API_BASE_URL}/public/announcements`, { signal });
  if (!response.ok) throw new Error('Could not load announcements.');

  const items = await response.json();
  return Array.isArray(items) ? items : [];
}
