/**
 * Reusable Print Preview Modal
 *
 * Shows a formal DOH letterhead preview before sending to the printer.
 * Pair with printDocument() for the actual print output.
 *
 * Usage:
 *   <PrintPreviewModal
 *     title="Patient Registry"
 *     clinicName={clinicName}
 *     printedBy={printedBy}
 *     dateFrom={dateFrom}   // optional
 *     dateTo={dateTo}       // optional
 *     onConfirm={handlePrint}
 *     onCancel={() => setShowModal(false)}
 *   >
 *     {previewContent}   ← your JSX preview of the data
 *   </PrintPreviewModal>
 */

interface PrintPreviewModalProps {
  title: string;
  clinicName: string;
  printedBy: string;
  /** Optional date range shown in the meta section */
  dateFrom?: string;
  dateTo?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}

export default function PrintPreviewModal({
  title,
  clinicName,
  printedBy,
  dateFrom,
  dateTo,
  onConfirm,
  onCancel,
  children,
}: PrintPreviewModalProps) {
  const printDate = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });

  const fmt = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ppm-title"
    >
      <div
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
            </div>
            <div>
              <h2 id="ppm-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-h)' }}>
                Print Preview — {title}
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Review before sending to printer</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Preview paper ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', background: '#f3f4f6' }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '28px 32px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', minHeight: 480, fontSize: 13 }}>

            {/* Letterhead */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 6 }}>
              <div style={{ width: 52, height: 52, border: '2px solid #000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>✚</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: '#333' }}>
                  Republic of the Philippines — Department of Health
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', margin: '2px 0' }}>{clinicName}</div>
                <div style={{ fontSize: 9, color: '#555' }}>Animal Bite Treatment Center</div>
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: '3px double #000', margin: '6px 0 3px' }}/>
            <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '2px 0 14px' }}/>

            {/* Document title */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, textDecoration: 'underline' }}>
                {title}
              </div>
            </div>

            {/* Meta */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 20px', border: '1px solid #ccc', padding: '9px 12px', marginBottom: 16, fontSize: 11 }}>
              {dateFrom && dateTo && (
                <>
                  <span style={{ color: '#444' }}>Reporting Period:</span>
                  <span style={{ fontWeight: 700 }}>{fmt(dateFrom)} – {fmt(dateTo)}</span>
                </>
              )}
              <span style={{ color: '#444' }}>Date Generated:</span>
              <span style={{ fontWeight: 700 }}>{printDate}</span>
              <span style={{ color: '#444' }}>Prepared by:</span>
              <span style={{ fontWeight: 700 }}>{printedBy}</span>
            </div>

            {/* Injected preview content */}
            {children}

            {/* Signature */}
            <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              <div>
                <div style={{ borderTop: '1px solid #000', marginTop: 32, paddingTop: 4 }}>
                  <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>{printedBy}</div>
                  <div style={{ fontSize: 10, color: '#555' }}>Prepared by</div>
                </div>
              </div>
              <div>
                <div style={{ borderTop: '1px solid #000', marginTop: 32, paddingTop: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 11 }}>____________________________</div>
                  <div style={{ fontSize: 10, color: '#555' }}>Noted by / Authorized Signatory</div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 24, paddingTop: 8, borderTop: '2px solid #000', display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#555' }}>
              <span>{clinicName} — Animal Bite Treatment Center</span>
              <span>{printDate}</span>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid #e5e7eb', flexShrink: 0, background: '#fafafa', borderRadius: '0 0 16px 16px' }}>
          <button
            onClick={onCancel}
            style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print Now
          </button>
        </div>
      </div>
    </div>
  );
}
