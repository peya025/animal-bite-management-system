import { DOCTOR_RE_EXPOSURE_OPTIONS } from '../../constants/consultation.constants';
import { SearchableSelect } from '../../../../components/forms/SearchableSelect';
import { FormField } from '../FormField';

const RE_EXPOSURE_PLAN_OPTIONS = DOCTOR_RE_EXPOSURE_OPTIONS.filter((opt) => opt.value !== '');

interface ReExposureAssessmentSectionProps {
  entry: any;
  requiresReExposureDecision: boolean;
  isFormDisabled: boolean;
  treatmentPlan: string;
  error?: string;
  onUpdateTreatmentPlan: (plan: string) => void;
}

/**
 * Re-exposure remains standard Form 2. The incident is collected at
 * check-in, so this control captures the physician's clinical decision.
 */
export default function ReExposureAssessmentSection({
  entry,
  requiresReExposureDecision,
  isFormDisabled,
  treatmentPlan,
  error,
  onUpdateTreatmentPlan,
}: ReExposureAssessmentSectionProps) {
  const incident = entry?.incident || entry?.bite_incident || entry?.biteIncident;
  const needsDecision = requiresReExposureDecision;

  if (!needsDecision) return null;

  return (
    <div className="fm-section" style={{ background: 'var(--nav-item-active-bg, #f0fdf4)', padding: '16px 20px', borderRadius: 10, border: '1px solid var(--input-border, #a7f3d0)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text-h, #065f46)' }}>
            Doctor Treatment Decision (Re-exposure Protocol)
          </h4>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-secondary, #047857)' }}>
            Episode #{incident?.episode_number || '—'} documented under DOH Rabies Guidelines.
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#065f46', background: '#dcfce7', borderRadius: 999, padding: '4px 10px', border: '1px solid #86efac' }}>
          RE-EXPOSURE
        </span>
      </div>

      <div className="fm-grid fm-grid--1">
        <FormField
          id="field-treatment_plan"
          label="Treatment Plan"
          required
          error={!!error}
          errorText={error}
        >
          <SearchableSelect
            name="treatment_plan"
            aria-label="Treatment Plan"
            value={treatmentPlan}
            options={RE_EXPOSURE_PLAN_OPTIONS}
            placeholder="Select Doctor Re-Exposure Plan…"
            searchPlaceholder="Search treatment plan..."
            onChange={onUpdateTreatmentPlan}
            disabled={isFormDisabled}
          />
        </FormField>
      </div>
    </div>
  );
}
