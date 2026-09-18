import { DOCTOR_RE_EXPOSURE_OPTIONS } from '../../constants/consultation.constants';

interface ReExposureAssessmentSectionProps {
  entry: any;
  requiresReExposureDecision: boolean;
  isFormDisabled: boolean;
  treatmentPlan: string;
  onUpdateTreatmentPlan: (plan: string) => void;
}

/**
 * Re-exposure remains the standard Form 2. The incident is collected at
 * check-in, so this control only captures the physician's decision.
 */
export default function ReExposureAssessmentSection({
  entry,
  requiresReExposureDecision,
  isFormDisabled,
  treatmentPlan,
  onUpdateTreatmentPlan,
}: ReExposureAssessmentSectionProps) {
  const incident = entry?.incident || entry?.bite_incident || entry?.biteIncident;
  const needsDecision = requiresReExposureDecision;

  if (!needsDecision) return null;

  return (
    <div style={{ marginTop: 28, padding: '16px 18px', borderRadius: 10, border: '1px solid #bfdbfe', background: '#f8fbff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e3a8a' }}>Doctor treatment decision</h4>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#475569' }}>
            Episode #{incident?.episode_number || '—'} is documented above using the standard Form 2.
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', borderRadius: 999, padding: '4px 9px' }}>
          RE-EXPOSURE
        </span>
      </div>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1e3a8a', marginBottom: 6 }}>
        Treatment plan <span style={{ color: '#dc2626' }}>*</span>
      </label>
      <select
        value={treatmentPlan}
        onChange={(event) => onUpdateTreatmentPlan(event.target.value)}
        disabled={isFormDisabled}
        style={{ width: '100%', padding: '10px 12px', border: '1px solid #93c5fd', borderRadius: 7, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', background: '#fff', color: '#1e3a8a' }}
      >
        {DOCTOR_RE_EXPOSURE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}
