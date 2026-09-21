import { FormField } from '../FormField';

interface ClinicalAddendumSectionProps {
  hasExistingRecord: boolean;
  hasAdministeredVaccine: boolean;
  readOnly: boolean;
  existingRecord: any;
  addendumNote: string;
  savingAddendum: boolean;
  addendumSuccess: string;
  onAddendumNoteChange: (val: string) => void;
  onSaveAddendum: () => void;
}

export default function ClinicalAddendumSection({
  hasExistingRecord,
  hasAdministeredVaccine,
  readOnly,
  existingRecord,
  addendumNote,
  savingAddendum,
  addendumSuccess,
  onAddendumNoteChange,
  onSaveAddendum,
}: ClinicalAddendumSectionProps) {
  if (!hasExistingRecord) return null;

  return (
    <div className="fm-section" style={{ marginTop: 28, paddingTop: 20, borderTop: '2px dashed var(--border-glow, #e2e8f0)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 className="fm-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>
          Clinical Addendum & Progress Notes
        </h3>
        {hasAdministeredVaccine && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              background: 'var(--nav-item-active-bg, #ecfdf5)',
              color: 'var(--nav-item-active-color, #047857)',
              borderRadius: 99,
              padding: '2px 10px',
              border: '1px solid var(--input-border, #a7f3d0)',
            }}
          >
            Post-Treatment Addenda Active
          </span>
        )}
      </div>

      {/* Display existing notes if present */}
      <div style={{ marginTop: 12, marginBottom: 16 }}>
        {existingRecord?.administration_notes ? (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-secondary, #f8fafc)',
              border: '1px solid var(--card-border, #e2e8f0)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--text-h, #334155)',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
            }}
          >
            {existingRecord.administration_notes}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-secondary, #94a3b8)', fontStyle: 'italic', margin: 0 }}>
            No clinical addenda recorded yet.
          </p>
        )}
      </div>

      {/* Addendum Entry Form */}
      {hasAdministeredVaccine && !readOnly && (
        <div
          style={{
            backgroundColor: 'var(--nav-item-active-bg, #f0fdf4)',
            padding: 16,
            borderRadius: 8,
            border: '1px solid var(--input-border, #a7f3d0)',
          }}
        >
          <div className="fm-grid fm-grid--1">
            <FormField label="Append Clinical Addendum Note (Physician / Clinical Staff)">
              <textarea
                className="fm-textarea"
                name="addendum_note"
                rows={2}
                placeholder="Enter clinical progress note or diagnostic update here..."
                value={addendumNote}
                onChange={(e) => onAddendumNoteChange(e.target.value)}
                disabled={savingAddendum}
              />
            </FormField>

            {addendumSuccess && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  backgroundColor: '#ecfdf5',
                  color: '#065f46',
                  fontSize: 13,
                  fontWeight: 600,
                  border: '1px solid #a7f3d0',
                }}
              >
                ✓ {addendumSuccess}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="button"
                className="fm-btn fm-btn--submit"
                onClick={onSaveAddendum}
                disabled={savingAddendum || !addendumNote.trim()}
                style={{ minHeight: 38, padding: '6px 18px', fontSize: 13 }}
              >
                {savingAddendum ? 'Saving Note…' : '+ Add Clinical Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
