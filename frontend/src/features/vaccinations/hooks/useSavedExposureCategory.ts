import { useEffect, useState } from 'react';
import api from '../../../services/api';

// Refresh only the informational category, preserving the nurse's unsaved fields.
export function useSavedExposureCategory(open: boolean, patientId?: number | string | null, biteId?: number | string | null) {
  const [category, setCategory] = useState<string | undefined>();

  useEffect(() => {
    setCategory(undefined);
    if (!open || !patientId) return;
    let cancelled = false;
    let inFlight = false;
    const refresh = async () => {
      if (inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        const query = biteId ? `?bite_id=${biteId}` : '';
        const { data } = await api.get(`/tagoloan-treatment-cards/patient/${patientId}${query}`);
        if (!cancelled) setCategory(data.bite_incident?.exposure_category || data.existing_card?.exposure_category || '');
      } catch {
        // Keep the last saved value during a temporary connection failure.
      } finally {
        inFlight = false;
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    window.addEventListener('exposure-category-saved', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('exposure-category-saved', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [open, patientId, biteId]);

  return category;
}
