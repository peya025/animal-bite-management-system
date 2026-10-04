import type { User } from '../types';
import type { NotificationRecord } from '../components/NotificationButton';

/**
 * Resolves the exact destination URL with tab, filters, and stable identifiers
 * for a notification, respecting the logged-in user's role and permissions.
 */
export function resolveNotificationDestination(
  notification: NotificationRecord,
  user: User | null | undefined
): string {
  const type = notification.type || '';
  const category = notification.category || '';
  const data = notification.data || {};
  const userRole = user?.role || '';

  // 1. Overdue Patient
  if (type === 'vaccination_overdue' || category === 'overdue') {
    const patientId = data.patient_id || (notification as any).patient_id;
    const appointmentId = data.appointment_id || (notification as any).appointment_id || '';
    const dose = data.dose_number ?? '';

    if (userRole === 'registration') {
      return patientId ? `/patients?patient_id=${patientId}` : '/patients';
    }

    const params = new URLSearchParams();
    params.set('tab', 'missed');
    if (patientId) params.set('patient_id', String(patientId));
    if (appointmentId) params.set('appointment_id', String(appointmentId));
    if (dose !== '') params.set('dose', String(dose));
    params.set('status_context', 'overdue');
    return `/vaccinations?${params.toString()}`;
  }

  // 2. Appointment Scheduled / Confirmed
  if (
    type === 'appointment_event' ||
    type === 'appointment_booked' ||
    type === 'appointment_confirmed' ||
    category === 'appointment'
  ) {
    const patientId = data.patient_id || (notification as any).patient_id;
    const appointmentId = data.appointment_id || (notification as any).appointment_id || '';
    const dose = data.dose_number ?? '';

    if (userRole === 'registration') {
      return patientId ? `/patients?patient_id=${patientId}` : '/patients';
    }

    const params = new URLSearchParams();
    params.set('tab', 'matrix');
    if (patientId) params.set('patient_id', String(patientId));
    if (appointmentId) params.set('appointment_id', String(appointmentId));
    if (dose !== '') params.set('dose', String(dose));
    params.set('status_context', 'scheduled');
    return `/vaccinations?${params.toString()}`;
  }

  // 3. Queue Check-In / Registered
  if (type === 'queue_event' || type === 'queue_registered' || type === 'queue_called' || category === 'queue') {
    const queueId = data.queue_id || '';
    const patientId = data.patient_id || (notification as any).patient_id || '';
    const station = (data.station || '').toLowerCase();
    const visitType = (data.visit_type || '').toLowerCase();
    const isTreatment =
      station.includes('treatment') ||
      ['vaccination', 'follow_up', 'observation', 'booster'].includes(visitType);

    const stationParam = isTreatment ? 'treatment' : 'triage';
    const queueDate = data.queue_date || (notification.created_at ? notification.created_at.slice(0, 10) : '');

    const params = new URLSearchParams();
    params.set('station', stationParam);
    if (queueId) params.set('queueId', String(queueId));
    if (patientId) params.set('patientId', String(patientId));
    if (queueDate) params.set('date', queueDate);

    // If Treatment Nurse clicking a treatment queue checkin, both /nurse/patients and /queue are valid
    if (userRole === 'treatment' && isTreatment) {
      return `/nurse/patients?${params.toString()}`;
    }

    return `/queue?${params.toString()}`;
  }

  // 4. New Stock Received
  if (type === 'inventory_stock_received' || type === 'stock_received') {
    const inventoryId = data.inventory_id || '';
    if (inventoryId) {
      return `/inventory?tab=stockcard&batchId=${inventoryId}`;
    }
    return '/inventory?tab=stockcard';
  }

  // 5. New Vaccine Added
  if (type === 'vaccine_preset_created') {
    const presetId = data.preset_id || '';
    const vaccineName = data.vaccine_name || '';

    // Only Admin and Developer have access to /inventory/types
    if (userRole === 'admin' || userRole === 'developer') {
      return presetId ? `/inventory/types?presetId=${presetId}` : '/inventory/types';
    }

    // Treatment nurse gets inventory table filtered to the new vaccine name
    if (vaccineName) {
      return `/inventory?tab=table&search=${encodeURIComponent(vaccineName)}`;
    }
    return '/inventory';
  }

  // 6. Low / Out-of-Stock Alert
  if (
    type === 'inventory_low_stock' ||
    type === 'inventory_out_of_stock' ||
    type === 'low_stock' ||
    type === 'out_of_stock'
  ) {
    const vaccineName = data.vaccine_name || '';
    const isOut = type.includes('out_of_stock');
    const statusFilter = isOut ? 'depleted' : 'low-stock';

    const params = new URLSearchParams();
    params.set('tab', 'table');
    if (vaccineName) params.set('search', vaccineName);
    params.set('statusFilter', statusFilter);
    return `/inventory?${params.toString()}`;
  }

  // 7. Near-Expiry / Expired Batch
  if (
    type === 'batch_expired' ||
    type === 'batch_near_expiry' ||
    type === 'stock_expired' ||
    type === 'near_expiry' ||
    category === 'expiry'
  ) {
    const inventoryId = data.inventory_id || '';
    if (inventoryId) {
      return `/inventory?tab=stockcard&batchId=${inventoryId}`;
    }
    return '/inventory?tab=stockcard';
  }

  // 8. High-Risk Exposure Area
  if (type === 'high_risk_area' || category === 'high_risk' || category === 'surveillance') {
    const location = data.location || '';
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    params.set('period', 'month');
    params.set('category', 'severe');
    return `/bite-map?${params.toString()}`;
  }

  // Fallback to notification's action_url or role default
  if (notification.action_url) {
    return notification.action_url;
  }

  return '/dashboard';
}

/**
 * Highlights a record DOM element with an attention-drawing pulse
 * and smoothly scrolls it to the center of the viewport.
 */
export function highlightRecordElement(
  elementId: string,
  isPill: boolean = false,
  delayMs: number = 200
): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const highlightClass = isPill
          ? 'notification-highlight-pill'
          : 'notification-highlight-target';

        el.classList.add(highlightClass);

        setTimeout(() => {
          el.classList.remove(highlightClass);
        }, 4000);

        resolve(true);
      } else {
        resolve(false);
      }
    }, delayMs);
  });
}

