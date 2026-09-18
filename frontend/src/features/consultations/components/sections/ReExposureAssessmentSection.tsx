import React from 'react';
import type { NewBiteData } from '../../types/consultation.types';
import { DOCTOR_RE_EXPOSURE_OPTIONS } from '../../constants/consultation.constants';

interface ReExposureAssessmentSectionProps {
  entry: any;
  isReturningNewBite: boolean;
  episodeHistory: any[];
  newBiteData: NewBiteData;
  isFormDisabled: boolean;
  temperature: string;
  bloodPressure: string;
  treatmentPlan: string;
  onUpdateNewBiteData: React.Dispatch<React.SetStateAction<NewBiteData>>;
  onUpdateTreatmentPlan: (plan: string) => void;
}

export default function ReExposureAssessmentSection({
  entry,
  isReturningNewBite,
  episodeHistory,
  newBiteData,
  isFormDisabled,
  temperature,
  bloodPressure,
  treatmentPlan,
  onUpdateNewBiteData,
  onUpdateTreatmentPlan,
}: ReExposureAssessmentSectionProps) {
  const shouldShow =
    isReturningNewBite ||
    entry?.incident?.episode_type === 'pending_assessment' ||
    entry?.bite_incident?.episode_type === 'pending_assessment' ||
    entry?.biteIncident?.episode_type === 'pending_assessment' ||
    entry?.incident?.episode_type === 're_exposure' ||
    (entry?.incident?.episode_number && Number(entry.incident.episode_number) > 1);

  if (!shouldShow) return null;

  return (
    <div
      style={{
        marginBottom: 24,
        padding: '20px',
        borderRadius: 12,
        border: '2px solid #93c5fd',
        background: 'linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%)',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          borderBottom: '1px solid #dbeafe',
          paddingBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🛡️</span>
          <div>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e40af' }}>
              Re-Exposure &amp; New Bite Incident Assessment
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#4b5563' }}>
              Dedicated evaluation of new exposure incident, baseline immunization history, and clinical triage.
            </p>
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#1e40af',
            backgroundColor: '#dbeafe',
            padding: '4px 10px',
            borderRadius: 20,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Episode #{entry?.incident?.episode_number || 2} Re-Exposure
        </span>
      </div>

      {/* 1. Prior Immunization History & Guidelines */}
      {episodeHistory.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 14px',
            borderRadius: 8,
            background: '#ffffff',
            border: '1px solid #bfdbfe',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#1e3a8a',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}
            >
              Prior Episode &amp; Vaccination History
            </div>
            <span
              style={{
                fontSize: 11,
                color: '#047857',
                fontWeight: 600,
                background: '#dcfce7',
                padding: '2px 8px',
                borderRadius: 12,
              }}
            >
              ✓ Verified on File
            </span>
          </div>
          {episodeHistory.slice(0, 3).map((episode) => (
            <div
              key={episode.bite_id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                fontSize: 12,
                color: '#334155',
                padding: '3px 0',
              }}
            >
              <span>
                Episode {episode.episode_number} · Bite Date: <strong>{episode.bite_date || 'Not recorded'}</strong>
              </span>
              <span style={{ fontWeight: 600, color: '#1e40af' }}>
                {episode.plan?.plan_type ? episode.plan.plan_type.replaceAll('_', ' ').toUpperCase() : 'Prior Regimen'}{' '}
                · Completed Doses:{' '}
                {episode.completed_dose_days?.length
                  ? episode.completed_dose_days.map((day: number) => `Day ${day}`).join(', ')
                  : 'none'}
              </span>
            </div>
          ))}
          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px dashed #e2e8f0',
              fontSize: 11,
              color: '#475569',
              lineHeight: 1.4,
            }}
          >
            💡 <strong>WHO / DOH Protocol Guide:</strong> If completed PEP &gt;3 months ago →{' '}
            <strong>2-Dose Booster (Day 0 &amp; Day 3)</strong>. If within 3 months →{' '}
            <strong>1-Dose Booster (Day 0 only)</strong>. If incomplete/unverified → restart Full PEP.
          </div>
        </div>
      )}

      {/* 2. New Bite Incident Exposure Details (Editable) */}
      <div
        style={{
          marginBottom: 16,
          padding: '14px',
          borderRadius: 8,
          background: '#ffffff',
          border: '1px solid #bfdbfe',
        }}
      >
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: '#1e3a8a',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            marginBottom: 12,
          }}
        >
          New Bite Incident &amp; Exposure Details
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Date of New Exposure
            </label>
            <input
              type="date"
              value={newBiteData.new_bite_date}
              onChange={(e) => onUpdateNewBiteData((prev) => ({ ...prev, new_bite_date: e.target.value }))}
              disabled={isFormDisabled}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12.5 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Place of Incident
            </label>
            <input
              type="text"
              value={newBiteData.new_bite_place}
              onChange={(e) => onUpdateNewBiteData((prev) => ({ ...prev, new_bite_place: e.target.value }))}
              placeholder="e.g. Barangay, Municipality"
              disabled={isFormDisabled}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12.5 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Exposure Severity / Category
            </label>
            <select
              value={newBiteData.new_severity}
              onChange={(e: any) => onUpdateNewBiteData((prev) => ({ ...prev, new_severity: e.target.value }))}
              disabled={isFormDisabled}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12.5 }}
            >
              <option value="minor">Category I - Minor (Intact skin / lick)</option>
              <option value="moderate">Category II - Moderate (Minor scratch / abrasion)</option>
              <option value="severe">Category III - Severe (Transdermal puncture, bleeding)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Nature of Exposure
            </label>
            <select
              value={newBiteData.new_exposure_type}
              onChange={(e: any) => onUpdateNewBiteData((prev) => ({ ...prev, new_exposure_type: e.target.value }))}
              disabled={isFormDisabled}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12.5 }}
            >
              <option value="bite">Bite (Puncture / Tear)</option>
              <option value="scratch">Scratch / Abrasion</option>
              <option value="lick">Lick / Saliva contact</option>
              <option value="other">Other Exposure</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Animal Involved
            </label>
            <select
              value={newBiteData.new_animal_type}
              onChange={(e: any) => onUpdateNewBiteData((prev) => ({ ...prev, new_animal_type: e.target.value }))}
              disabled={isFormDisabled}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12.5 }}
            >
              <option value="dog">Dog (Canine)</option>
              <option value="cat">Cat (Feline)</option>
              <option value="other">Other Animal</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Animal Status
            </label>
            <select
              value={newBiteData.new_animal_status}
              onChange={(e: any) => onUpdateNewBiteData((prev) => ({ ...prev, new_animal_status: e.target.value }))}
              disabled={isFormDisabled}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12.5 }}
            >
              <option value="alive">Alive &amp; Healthy</option>
              <option value="dead">Dead / Killed</option>
              <option value="rabid">Rabid / Symptoms</option>
              <option value="unknown">Unknown / Stray</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Washed with Soap &amp; Water?
            </label>
            <select
              value={newBiteData.new_site_washed ? 'yes' : 'no'}
              onChange={(e) =>
                onUpdateNewBiteData((prev) => ({ ...prev, new_site_washed: e.target.value === 'yes' }))
              }
              disabled={isFormDisabled}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12.5 }}
            >
              <option value="yes">Yes (Immediate wash)</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Anatomical Body Part Exposed
            </label>
            <input
              type="text"
              value={newBiteData.new_body_part}
              onChange={(e) => onUpdateNewBiteData((prev) => ({ ...prev, new_body_part: e.target.value }))}
              placeholder="e.g. Right calf, Left forearm"
              disabled={isFormDisabled}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12.5 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Wound Description &amp; Clinical Findings
            </label>
            <input
              type="text"
              value={newBiteData.new_wound_description}
              onChange={(e) => onUpdateNewBiteData((prev) => ({ ...prev, new_wound_description: e.target.value }))}
              placeholder="e.g. 1cm puncture wound, minimal active bleeding, no signs of purulence"
              disabled={isFormDisabled}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12.5 }}
            />
          </div>
        </div>
      </div>

      {/* 3. Triage Vitals Highlight (Temperature & BP) */}
      <div
        style={{
          marginBottom: 16,
          padding: '12px 14px',
          borderRadius: 8,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🌡️</span>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block' }}>BODY TEMPERATURE</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <strong style={{ fontSize: 14, color: '#1e293b' }}>
                  {temperature ? `${temperature} °C` : 'Not measured'}
                </strong>
                {temperature &&
                  (parseFloat(temperature) >= 38.0 ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#b91c1c',
                        background: '#fee2e2',
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}
                    >
                      High Fever
                    </span>
                  ) : parseFloat(temperature) >= 37.5 ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#b45309',
                        background: '#fef3c7',
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}
                    >
                      Low Grade
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#15803d',
                        background: '#dcfce7',
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}
                    >
                      Afebrile / Normal
                    </span>
                  ))}
              </div>
            </div>
          </div>

          <div style={{ height: 28, width: 1, backgroundColor: '#cbd5e1' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🩺</span>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block' }}>BLOOD PRESSURE</span>
              <strong style={{ fontSize: 14, color: '#1e293b' }}>{bloodPressure || '—'} mmHg</strong>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: '#64748b', fontStyle: 'italic' }}>
          * Vitals synchronized with Consultation Details
        </div>
      </div>

      {/* 4. Doctor Treatment Decision */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e3a8a', marginBottom: 6 }}>
          Doctor Re-Exposure Treatment Decision <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <select
          value={treatmentPlan}
          onChange={(event) => onUpdateTreatmentPlan(event.target.value)}
          disabled={isFormDisabled}
          style={{
            width: '100%',
            padding: '11px 14px',
            border: '2px solid #3b82f6',
            borderRadius: 8,
            fontSize: 13.5,
            fontWeight: 600,
            fontFamily: 'inherit',
            background: '#ffffff',
            color: '#1e3a8a',
            boxShadow: '0 1px 3px rgba(59, 130, 246, 0.15)',
          }}
        >
          {DOCTOR_RE_EXPOSURE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
