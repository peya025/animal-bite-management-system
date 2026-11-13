type ReferralIntake = {
  intake_id: number;
  referral_document_photo?: string | null;
  submitted_at?: string | null;
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

  return (
    <section aria-label="Online booking referral slip" style={{ marginBottom: 20, padding: 16, border: '1px solid #d1e7dd', borderRadius: 10 }}>
      <strong>Referral slip from online booking</strong>
      {validPhoto ? <>
        <p>Photo attached to the latest online booking. Review it before entering referral details and vitals.</p>
        <details>
          <summary style={{ cursor: 'pointer' }}>View referral slip photo</summary>
          <img src={photo!} alt="Referral slip attached by the patient during online booking"
            style={{ display: 'block', maxWidth: '100%', maxHeight: 600, objectFit: 'contain', marginTop: 12 }} />
        </details>
      </> : <p style={{ marginBottom: 0 }}>
        {!patient ? 'Open the patient’s existing record to view photos attached through online booking.'
          : photo ? 'The saved attachment is unavailable. Ask the patient to provide the referral slip.'
          : 'No referral slip photo attached to the latest online booking.'}
      </p>}
    </section>
  );
}
