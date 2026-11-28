export type ReferralIntake = {
  intake_id: number;
  referral_facility?: string | null;
  referral_source?: string | null;
  referral_provider_name?: string | null;
  referral_blood_pressure?: string | null;
  referral_temperature?: string | null;
  referral_height?: string | null;
  referral_weight?: string | null;
  referral_document_photo?: string | null;
  submitted_at?: string | null;
  bite_date?: string | null;
  exposure_type?: string | null;
  animal_type?: string | null;
  bite_place?: string | null;
};

export default function OnlineReferralPhoto({ patient }: {
  patient?: { bite_intakes?: ReferralIntake[]; biteIntakes?: ReferralIntake[] } | null;
}) {
  const intakes = patient?.bite_intakes ?? patient?.biteIntakes ?? [];
  // Use the latest booking, never an older booking's photo as a fallback.
  const latest = [...intakes].sort((a, b) => b.intake_id - a.intake_id)[0];
  if (!latest) return null;
  const photo = latest?.referral_document_photo;
  const validPhoto = typeof photo === 'string' &&
    photo.length <= 2796236 && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(photo);

  const facility = latest.referral_facility || latest.referral_source;
  const hasReferralInfo = Boolean(
    facility ||
    latest.referral_provider_name ||
    latest.referral_blood_pressure ||
    latest.referral_temperature ||
    latest.referral_height ||
    latest.referral_weight ||
    validPhoto
  );

  return (
    <section aria-label="Online booking referral slip" style={{ marginBottom: 20, padding: 16, border: '1px solid #bbf7d0', borderRadius: 10, backgroundColor: '#f0fdf4' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <strong style={{ color: '#166534', fontSize: '13px' }}>📋 Facility Referral &amp; Pre-Arrival Information</strong>
        {facility && (
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>
            External Referral
          </span>
        )}
      </div>

      {hasReferralInfo ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 14px', fontSize: '12.5px', color: '#1f2937', marginBottom: 12 }}>
          {facility && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: '#4b5563', fontSize: '11px', display: 'block' }}>Referring Facility / Health Center</span>
              <strong style={{ color: '#14532d' }}>{facility}</strong>
            </div>
          )}
          {latest.referral_provider_name && (
            <div>
              <span style={{ color: '#4b5563', fontSize: '11px', display: 'block' }}>Attending Provider</span>
              <strong>{latest.referral_provider_name}</strong>
            </div>
          )}
          {latest.referral_blood_pressure && (
            <div>
              <span style={{ color: '#4b5563', fontSize: '11px', display: 'block' }}>Pre-Arrival BP</span>
              <strong>{latest.referral_blood_pressure} mmHg</strong>
            </div>
          )}
          {latest.referral_temperature && (
            <div>
              <span style={{ color: '#4b5563', fontSize: '11px', display: 'block' }}>Pre-Arrival Temp</span>
              <strong>{latest.referral_temperature} °C</strong>
            </div>
          )}
          {latest.referral_height && (
            <div>
              <span style={{ color: '#4b5563', fontSize: '11px', display: 'block' }}>Height</span>
              <strong>{latest.referral_height} cm</strong>
            </div>
          )}
          {latest.referral_weight && (
            <div>
              <span style={{ color: '#4b5563', fontSize: '11px', display: 'block' }}>Weight</span>
              <strong>{latest.referral_weight} kg</strong>
            </div>
          )}
        </div>
      ) : (
        <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#4b5563' }}>
          No external referral details reported for this booking.
        </p>
      )}

      {validPhoto ? (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#15803d', fontSize: '12.5px' }}>
            📎 View referral slip photo attached by patient
          </summary>
          <img
            src={photo!}
            alt="Referral slip attached by the patient during online booking"
            style={{ display: 'block', maxWidth: '100%', maxHeight: 500, objectFit: 'contain', marginTop: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}
          />
        </details>
      ) : (
        <p style={{ margin: 0, fontSize: '11.5px', color: '#6b7280', fontStyle: 'italic' }}>
          {!patient
            ? 'Open the patient’s existing record to view photos attached through online booking.'
            : photo
            ? 'The saved attachment is unavailable. Ask the patient to provide the physical referral slip.'
            : 'No referral slip photo attached to this online booking.'}
        </p>
      )}
    </section>
  );
}
