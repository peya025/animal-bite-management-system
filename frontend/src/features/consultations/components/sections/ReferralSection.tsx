import type { TreatmentFormData } from '../../types/consultation.types';
import { FormField } from '../FormField';

interface ReferralSectionProps {
  formData: TreatmentFormData;
}

export default function ReferralSection({ formData }: ReferralSectionProps) {
  return (
    <div className="fm-section">
      <h3 className="fm-section-title">
        II. For CHU / RHU Personnel Only (Para sa Kinatawan ng CHU / RHU Lamang)
      </h3>

      <div className="fm-grid">
        <FormField
          label="Mode of Transaction"
          className="fm-grid--full"
          hint="Set by Registration Staff during patient registration (View-only for Doctor)"
        >
          <div className="fm-radio-group">
            {(['walk-in', 'visited', 'referral'] as const).map((mode) => {
              const isSelected = (formData.mode_of_transaction || 'walk-in') === mode;
              return (
                <label
                  key={mode}
                  className="fm-radio"
                  style={{
                    cursor: 'default',
                    opacity: isSelected ? 1 : 0.65,
                  }}
                >
                  <input
                    type="radio"
                    name="mode_of_transaction"
                    value={mode}
                    checked={isSelected}
                    onChange={() => {}}
                    disabled={true}
                    readOnly={true}
                    style={{ cursor: 'default' }}
                  />
                  <span style={{ textTransform: 'capitalize', fontWeight: isSelected ? 600 : 400 }}>
                    {mode.replace('-', ' ')}
                  </span>
                </label>
              );
            })}
          </div>
        </FormField>
      </div>

      {(formData.mode_of_transaction === 'referral' || Boolean(formData.referred_by)) && (
        <div className="fm-grid" style={{ marginTop: 20 }}>
          <FormField label="Referred by" className="fm-grid--full" hint="From Form 1 patient registration">
            <input
              className="fm-input"
              type="text"
              value={formData.referred_by || '—'}
              readOnly
            />
          </FormField>
        </div>
      )}

      {formData.mode_of_transaction === 'referral' && (
        <div style={{ marginTop: 20 }}>
          <div className="fm-grid">
            <FormField label="Referred To" className="fm-grid--full" hint="📍 Primary Receiving Facility: Tagoloan RHU">
              <input
                className="fm-input"
                type="text"
                value="Tagoloan Rural Health Unit (RHU) / ABTC"
                readOnly
                disabled
              />
            </FormField>
          </div>
        </div>
      )}
    </div>
  );
}
