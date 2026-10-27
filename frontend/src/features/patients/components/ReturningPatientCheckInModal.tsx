import { useState, useEffect } from 'react';
import FormModal from '../../../components/forms/FormModal';
import api from '../../../shared/services/api';
import type { Patient } from '../types';

interface ReturningPatientCheckInModalProps {
  open: boolean;
  patient: Patient | null;
  onClose: () => void;
  onSuccess: (data: {
    patientName: string;
    patientNumber: string;
    queueNumber: number | string;
    station: string;
  }) => void;
}

function getManilaDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getManilaTimeString(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

function formatPatientName(patient: Patient | null): string {
  if (!patient) return '';
  return `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient';
}

export default function ReturningPatientCheckInModal({
  open,
  patient,
  onClose,
  onSuccess,
}: ReturningPatientCheckInModalProps) {
  const [bloodPressure, setBloodPressure] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && patient) {
      const summary = (patient as any).pending_treatment_summary;
      setBloodPressure('');
      setTemperature('');
      setWeight(summary?.weight ? String(summary.weight) : '');
      setHeight(summary?.height ? String(summary.height) : '');
      setError('');
      setSubmitting(false);
    }
  }, [open, patient]);

  if (!open || !patient) return null;

  const summary = (patient as any).pending_treatment_summary;
  const patientDisplayName = formatPatientName(patient);
  const pendingItems: string[] = summary?.pending_items || [];
  const consultationDate = summary?.consultation_date || '—';
  const exposureCategory = summary?.exposure_category ? `Category ${summary.exposure_category}` : '—';
  const treatmentStatus = (patient as any).treatment_status === 'not_administered'
    ? 'Not Administered on Previous Visit'
    : 'Pending Administration (Left Before Nurse Administration)';

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;

    if (!bloodPressure.trim() || !temperature.trim() || !weight.trim() || !height.trim()) {
      setError('Updated vital signs (Blood Pressure, Temperature, Weight, and Height) are required before checking in a returning patient for Doctor Reassessment.');
      return;
    }

    const patientId = patient.patient_id || (patient as any).id;
    if (!patientId) {
      setError('The patient record could not be identified. Please refresh the page and try again.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await api.post(`/patients/${patientId}/check-in`, {
        blood_pressure: bloodPressure.trim(),
        temperature: temperature.trim(),
        weight: weight.trim(),
        height: height.trim(),
        consultation_date: getManilaDateString(),
        consultation_time: getManilaTimeString(),
      });

      const queue = response.data?.queue;
      onSuccess({
        patientName: patientDisplayName,
        patientNumber: patient.patient_number || '',
        queueNumber: response.data?.queue_number || queue?.queue_number || '',
        station: 'Doctor Reassessment Queue',
      });
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Unable to check in this returning patient for Doctor Reassessment. Please try again.'
      );
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      title="Returning Patient — Check In for Doctor Reassessment"
      subtitle={`Case Consultation & Vitals Update • ${patient.patient_number || ''}`}
      onClose={onClose}
      maxWidth={620}
      footer={
        <>
          <button
            type="button"
            className="fm-btn fm-btn--cancel"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="fm-btn fm-btn--submit"
            onClick={() => handleSubmit()}
            disabled={submitting}
          >
            {submitting ? 'Checking In…' : 'Check In to Doctor Reassessment'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Previous Consultation & Pending Treatment Summary Box */}
        <div
          style={{
            backgroundColor: 'var(--amber-50, #fffbeb)',
            border: '1px solid var(--amber-200, #fde68a)',
            borderRadius: '12px',
            padding: '14px 16px',
            fontSize: '13px',
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: '#92400e',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <span>Previous Consultation & Pending Treatment</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#b45309' }}>
              {patientDisplayName} • {patient.patient_number || 'P-Record'}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px 16px',
              color: '#334155',
            }}
          >
            <div>
              <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>
                Previous Consultation Date
              </span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{consultationDate}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>
                Exposure Category
              </span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{exposureCategory}</span>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>
                Previous Prescribed Treatment
              </span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {pendingItems.length > 0 ? pendingItems.join(' • ') : 'Pending Doctor Order'}
              </span>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>
                Treatment Status
              </span>
              <span style={{ fontWeight: 600, color: '#b45309' }}>
                {treatmentStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Updated Vital Signs Section */}
        <div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-h, #0f172a)',
              marginBottom: '4px',
            }}
          >
            Updated Vital Signs (Required Before Doctor Reassessment)
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', margin: '0 0 12px' }}>
            Measure and enter the patient's current vitals upon clinic check-in.
          </p>

          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                marginBottom: '14px',
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px 14px',
            }}
          >
            <div className="fm-field">
              <label className="fm-label">
                Blood Pressure (mmHg) <span>*</span>
              </label>
              <input
                type="text"
                className="fm-input"
                placeholder="e.g. 120/80"
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
                autoFocus
              />
            </div>

            <div className="fm-field">
              <label className="fm-label">
                Temperature (°C) <span>*</span>
              </label>
              <input
                type="text"
                className="fm-input"
                placeholder="e.g. 36.8"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
            </div>

            <div className="fm-field">
              <label className="fm-label">
                Weight (kg) <span>*</span>
              </label>
              <input
                type="text"
                className="fm-input"
                placeholder="e.g. 62"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>

            <div className="fm-field">
              <label className="fm-label">
                Height (cm) <span>*</span>
              </label>
              <input
                type="text"
                className="fm-input"
                placeholder="e.g. 165"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Informational Guidance Note */}
        <div
          style={{
            fontSize: '11.5px',
            color: 'var(--text-secondary, #64748b)',
            lineHeight: 1.45,
            backgroundColor: 'var(--card-bg-subtle, #f8fafc)',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          <strong style={{ color: '#334155' }}>Workflow Note:</strong> This check-in links to the existing bite case
          without creating a duplicate bite incident, updates today's vital signs, and routes the patient directly to the
          Doctor Triage / Reassessment Queue.
        </div>
      </form>
    </FormModal>
  );
}
