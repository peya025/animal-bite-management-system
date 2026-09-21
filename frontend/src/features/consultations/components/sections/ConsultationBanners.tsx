interface ConsultationBannersProps {
  isReturningNewBite: boolean;
  hasAdministeredVaccine: boolean;
  hasExistingRecord: boolean;
  isEditing: boolean;
  readOnly: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}

export default function ConsultationBanners({
  isReturningNewBite,
  hasAdministeredVaccine,
  hasExistingRecord,
  isEditing,
  readOnly,
  onStartEdit,
  onCancelEdit,
}: ConsultationBannersProps) {
  return (
    <>
      {/* 🛡️ Returning Patient Banner */}
      {isReturningNewBite && !hasAdministeredVaccine && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 18px',
            marginBottom: 24,
            backgroundColor: 'var(--nav-item-active-bg, #ecfdf5)',
            border: '1.5px solid var(--input-border, #a7f3d0)',
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 20 }}>🛡️</span>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-h, #065f46)' }}>
              Prior Immunization History Verified — New Bite Assessment
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #047857)', marginTop: 2 }}>
              Patient has documented rabies vaccination on file and returned with a new animal bite exposure. Record clinical assessment and exposure details below.
            </div>
          </div>
        </div>
      )}

      {/* 🔒 Medical-Legal Post-Treatment Lock Banner */}
      {hasAdministeredVaccine ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            marginBottom: 24,
            backgroundColor: '#fffbeb',
            border: '1.5px solid #f59e0b',
            borderRadius: 8,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🔒</span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#92400e' }}>
                Clinical Assessment Locked (Post-Treatment)
              </div>
              <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>
                Exposure diagnosis and clinical orders cannot be modified after vaccination has started. Use the Addendum section below to append clinical notes.
              </div>
            </div>
          </div>
          <div
            style={{
              padding: '4px 12px',
              backgroundColor: '#fef3c7',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              color: '#92400e',
              border: '1px solid #fde68a',
              whiteSpace: 'nowrap',
            }}
          >
            Vaccinated · Read Only
          </div>
        </div>
      ) : hasExistingRecord && !isEditing ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            marginBottom: 24,
            backgroundColor: 'var(--bg-secondary, #f8fafc)',
            border: '1.5px solid var(--border-glow, #cbd5e1)',
            borderRadius: 8,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-h, #334155)' }}>
              📄 Existing Treatment Record (Form 2)
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)', marginTop: 2 }}>
              A consultation record is currently saved. Click "Edit Record" to update diagnosis or orders before vaccination starts.
            </div>
          </div>
          {!readOnly && (
            <button
              type="button"
              className="fm-btn fm-btn--submit"
              onClick={onStartEdit}
              style={{
                minHeight: 38,
                padding: '6px 18px',
                fontSize: 13,
              }}
            >
              ✏️ Edit Record
            </button>
          )}
        </div>
      ) : hasExistingRecord && isEditing ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            marginBottom: 24,
            backgroundColor: '#eff6ff',
            border: '1.5px solid #93c5fd',
            borderRadius: 8,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1e40af' }}>
              ✏️ Editing Active Assessment (Form 2)
            </div>
            <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 2 }}>
              Modifications will update this patient's existing clinical assessment record.
            </div>
          </div>
          <button
            type="button"
            className="fm-btn fm-btn--cancel"
            onClick={onCancelEdit}
            style={{
              minHeight: 38,
              padding: '6px 18px',
              fontSize: 13,
            }}
          >
            Cancel Edit
          </button>
        </div>
      ) : null}
    </>
  );
}
