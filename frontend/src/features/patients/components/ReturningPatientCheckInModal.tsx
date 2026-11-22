import { useState, useEffect } from 'react';
import FormModal from '../../../components/forms/FormModal';
import api from '../../../shared/services/api';
import type { Patient } from '../types';

interface ReturningPatientCheckInModalProps {
  open: boolean;
  mode?: 'reassess' | 'checkin';
  patient: Patient | null;
  onClose: () => void;
  onSuccess: (data: {
    patientName: string;
    patientNumber: string;
    queueNumber: number | string;
    station: string;
    alreadyInQueue?: boolean;
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
  mode = 'reassess',
  patient,
  onClose,
  onSuccess,
}: ReturningPatientCheckInModalProps) {
  const [bloodPressure, setBloodPressure] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [modeOfTransaction, setModeOfTransaction] = useState<'walk-in' | 'visited' | 'referral'>('walk-in');
  const [referredBy, setReferredBy] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isReassess = mode === 'reassess';

  useEffect(() => {
    if (open && patient) {
      const summary = (patient as any).pending_treatment_summary;
      const latestConsult = (patient as any).latest_consultation_record || (patient as any).latestConsultationRecord;
      const latestRecord = (patient as any).latest_treatment_record || (patient as any).latestTreatmentRecord;

      const priorWeight = summary?.weight ?? latestConsult?.weight ?? latestRecord?.weight ?? '';
      const priorHeight = summary?.height ?? latestConsult?.height ?? latestRecord?.height ?? '';
      const priorReferredBy = latestConsult?.referred_by ?? latestRecord?.referred_by ?? '';
      const priorMode = latestConsult?.mode_of_transaction ?? latestRecord?.mode_of_transaction;

      setBloodPressure('');
      setTemperature('');
      setWeight(priorWeight ? String(priorWeight) : '');
      setHeight(priorHeight ? String(priorHeight) : '');
      setReferredBy(priorReferredBy ? String(priorReferredBy) : '');
      setModeOfTransaction(
        priorMode === 'referral' || priorMode === 'visited' || priorMode === 'walk-in'
          ? priorMode
          : priorReferredBy
          ? 'referral'
          : 'walk-in'
      );
      setError('');
      setSubmitting(false);
    }
  }, [open, patient, mode]);

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
      setError(
        isReassess
          ? 'Updated vital signs (Blood Pressure, Temperature, Weight, and Height) are required before checking in a returning patient for Doctor Reassessment.'
          : 'Updated vital signs (Blood Pressure, Temperature, Weight, and Height) are required before checking in the patient for Doctor Triage.'
      );
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
        is_reassessment: isReassess,
        blood_pressure: bloodPressure.trim(),
        temperature: temperature.trim(),
        weight: weight.trim(),
        height: height.trim(),
        mode_of_transaction: modeOfTransaction,
        referred_by: referredBy.trim() || null,
        consultation_date: getManilaDateString(),
        consultation_time: getManilaTimeString(),
      });

      const queue = response.data?.queue;
      onSuccess({
        patientName: patientDisplayName,
        patientNumber: patient.patient_number || '',
        queueNumber: response.data?.queue_number || queue?.queue_number || '',
        station: isReassess ? 'Doctor Reassessment Queue' : 'Doctor Assessment',
        alreadyInQueue: response.data?.code === 'ALREADY_IN_QUEUE',
      });
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        (isReassess
          ? 'Unable to check in this returning patient for Doctor Reassessment. Please try again.'
          : 'Unable to check in this patient for Doctor Triage. Please try again.')
      );
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      title={
        isReassess
          ? 'Returning Patient — Check In for Doctor Reassessment'
          : 'Patient Check-In — Vital Signs & Referral'
      }
      subtitle={`Case Consultation, Vitals & Referral • ${patient.patient_number || ''}`}
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
            {submitting
              ? 'Checking In…'
              : isReassess
              ? 'Check In to Doctor Reassessment'
              : 'Check In to Doctor Triage'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {isReassess ? (
          /* Previous Consultation & Pending Treatment Summary Box */
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
              <span>Previous Consultation &amp; Pending Treatment</span>
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
        ) : (
          /* Returning Triage Check-In Summary Box */
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <span style={{ fontWeight: 700, color: '#166534' }}>Doctor Triage Check-In</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#15803d' }}>
              {patientDisplayName} • {patient.patient_number || 'P-Record'}
            </span>
          </div>
        )}

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
            {isReassess
              ? 'Updated Vital Signs (Required Before Doctor Reassessment)'
              : 'Current Vital Signs (Required Before Doctor Triage)'}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', margin: '0 0 12px' }}>
            Measure and enter the patient&apos;s current vitals upon clinic check-in.
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

        {/* Referral & Mode of Transaction Section */}
        <div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-h, #0f172a)',
              marginBottom: '4px',
            }}
          >
            Referral Information (Optional)
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', margin: '0 0 10px' }}>
            Record if the patient was referred by a Barangay Health Station, RHU, or hospital.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px 14px',
            }}
          >
            <div className="fm-field">
              <label className="fm-label">Mode of Transaction</label>
              <select
                className="fm-input"
                value={modeOfTransaction}
                onChange={(e) => setModeOfTransaction(e.target.value as 'walk-in' | 'visited' | 'referral')}
              >
                <option value="walk-in">Walk-in</option>
                <option value="visited">Visited</option>
                <option value="referral">Referral</option>
              </select>
            </div>

            <div className="fm-field">
              <label className="fm-label">Referred By / Referring Facility</label>
              <input
                type="text"
                className="fm-input"
                placeholder="e.g. BHS Poblacion / Tagoloan RHU"
                value={referredBy}
                onChange={(e) => {
                  const val = e.target.value;
                  setReferredBy(val);
                  if (val.trim() && modeOfTransaction === 'walk-in') {
                    setModeOfTransaction('referral');
                  }
                }}
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
          <strong style={{ color: '#334155' }}>Workflow Note:</strong>{' '}
          {isReassess
            ? "This check-in links to the existing bite case without creating a duplicate bite incident, updates today's vital signs and referral details, and routes the patient directly to the Doctor Triage / Reassessment Queue."
            : "This check-in records today's vital signs and referral details and queues the patient for Doctor Triage assessment."}
        </div>
      </form>
    </FormModal>
  );
}
