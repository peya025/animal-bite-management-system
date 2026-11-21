import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { PrinterIcon } from '@hugeicons/core-free-icons';
import api from '../../../services/api';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { printWhenReady } from '../../../components/print/printReady';
import CompactTreatmentCard from './CompactTreatmentCard';
import type { PrintableFormRecord } from './PrintableForm';
import { buildPrintableRecord, isRecordGiven } from '../utils/treatmentCardData';

export interface BatchCardItem {
  patientId: number;
  biteId?: number | null;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  items: BatchCardItem[];
}

type PaperKey = 'a4' | 'letter' | 'long';

/** Sheet sizes in millimetres (portrait). Each sheet is split into two landscape halves. */
const PAPER_SIZES: Record<PaperKey, { label: string; width: number; height: number }> = {
  a4: { label: 'A4 (210 × 297 mm)', width: 210, height: 297 },
  letter: { label: 'Short (8.5 × 11 in)', width: 215.9, height: 279.4 },
  long: { label: 'Long (8.5 × 13 in)', width: 215.9, height: 330.2 },
};

const PAPER_STORAGE_KEY = 'batchTreatmentCardPaper';

interface LoadedCard {
  item: BatchCardItem;
  record: PrintableFormRecord | null;
  error?: string;
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export default function BatchTreatmentCardPrintModal({ open, onClose, items }: Props) {
  const { clinic: authClinic } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<LoadedCard[]>([]);
  const [signatures, setSignatures] = useState<Record<string, string | null>>({});
  const [paper, setPaper] = useState<PaperKey>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(PAPER_STORAGE_KEY) : null;
    return saved === 'letter' || saved === 'long' || saved === 'a4' ? saved : 'a4';
  });

  useEffect(() => {
    window.localStorage.setItem(PAPER_STORAGE_KEY, paper);
  }, [paper]);

  useEffect(() => {
    if (!open || items.length === 0) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      setCards([]);
      setSignatures({});

      const loaded: LoadedCard[] = await Promise.all(items.map(async (item) => {
        try {
          const query = item.biteId ? `?bite_id=${item.biteId}` : '';
          const res = await api.get(`/tagoloan-treatment-cards/patient/${item.patientId}${query}`);
          return { item, record: buildPrintableRecord(res.data, authClinic) };
        } catch {
          return { item, record: null, error: 'Card data could not be loaded.' };
        }
      }));

      // Pre-fetch nurse signatures so they are already rendered when the print dialog opens.
      const treatmentIds = new Set<string>();
      loaded.forEach(({ record }) => {
        [...(record?.treatment_records || []), ...(record?.prophylaxis_records || [])].forEach((r) => {
          if (r.treatment_id && isRecordGiven(r)) treatmentIds.add(String(r.treatment_id));
        });
      });
      const sigEntries = await Promise.all(Array.from(treatmentIds).map(async (id) => {
        try {
          const res = await api.get(`/vaccination-records/${id}/signature`, { responseType: 'blob' });
          return [id, await blobToDataUrl(res.data)] as const;
        } catch {
          return [id, null] as const;
        }
      }));

      if (!active) return;
      setCards(loaded);
      setSignatures(Object.fromEntries(sigEntries));
      setLoading(false);
    };

    void load();
    return () => { active = false; };
    // authClinic is only used as a fallback for clinic details; reloading on its identity change is unnecessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items]);

  const pages = useMemo(() => {
    const result: LoadedCard[][] = [];
    for (let i = 0; i < cards.length; i += 2) result.push(cards.slice(i, i + 2));
    return result;
  }, [cards]);

  if (!open) return null;

  const size = PAPER_SIZES[paper];
  const halfHeight = size.height / 2;
  const failedCount = cards.filter((c) => !c.record).length;

  const renderHalf = (card: LoadedCard | undefined, position: 'top' | 'bottom') => (
    <div
      className="batch-card-half"
      style={{
        height: `${halfHeight - 0.3}mm`,
        padding: '7mm 10mm',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
        borderBottom: position === 'top' ? '1px dashed #6b7280' : 'none',
      }}
    >
      {card?.record ? (
        <CompactTreatmentCard record={card.record} signatures={signatures} />
      ) : card ? (
        <div style={{ fontSize: '9pt', color: '#b91c1c', fontFamily: 'Arial, sans-serif' }}>
          {card.item.name}: {card.error}
        </div>
      ) : null}
    </div>
  );

  return createPortal(
    <div
      id="batch-card-print-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @page {
          size: ${size.width}mm ${size.height}mm;
          margin: 0;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          body > *:not(#batch-card-print-overlay) {
            display: none !important;
          }
          #batch-card-print-overlay {
            position: static !important;
            inset: auto !important;
            padding: 0 !important;
            background: transparent !important;
            backdrop-filter: none !important;
            display: block !important;
          }
          #batch-card-print-overlay .batch-modal-card {
            max-width: none !important;
            max-height: none !important;
            width: auto !important;
            height: auto !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
            display: block !important;
          }
          #batch-card-print-overlay .no-print {
            display: none !important;
          }
          #batch-card-print-overlay .batch-scroll-area {
            overflow: visible !important;
            padding: 0 !important;
            background: transparent !important;
            display: block !important;
          }
          #batch-card-print-overlay .batch-sheet {
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            break-after: page;
            page-break-after: always;
          }
          #batch-card-print-overlay .batch-sheet:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div
        className="batch-modal-card"
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div className="no-print" style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Print Treatment Cards — 2 per page</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              {items.length} card{items.length === 1 ? '' : 's'} · {Math.ceil(items.length / 2)} sheet{Math.ceil(items.length / 2) === 1 ? '' : 's'} of bond paper
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', width: 32, height: 32, cursor: 'pointer', fontSize: '16px', color: '#475569' }}
          >
            ×
          </button>
        </div>

        {/* Paper size selector */}
        <div className="no-print" style={{ padding: '10px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', background: '#f8fafc' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Paper:</span>
          {(Object.keys(PAPER_SIZES) as PaperKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPaper(key)}
              style={{
                border: paper === key ? '1px solid #10b981' : '1px solid #cbd5e1',
                background: paper === key ? '#ecfdf5' : '#fff',
                color: paper === key ? '#047857' : '#475569',
                fontWeight: 600,
                fontSize: '0.78rem',
                padding: '5px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              {PAPER_SIZES[key].label}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#64748b' }}>
            Set the printer to this paper size, scale 100% / "Actual size".
          </span>
        </div>

        {failedCount > 0 && !loading && (
          <div className="no-print" style={{ padding: '8px 20px', background: '#fef2f2', color: '#b91c1c', fontSize: '0.8rem', borderBottom: '1px solid #fecaca' }}>
            {failedCount} card{failedCount === 1 ? '' : 's'} could not be loaded and will print as an error note.
          </div>
        )}

        {/* Preview / print area */}
        <div
          className="batch-scroll-area"
          style={{ flex: 1, overflowY: 'auto', background: '#cbd5e1', padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
        >
          {loading ? (
            <div className="no-print" style={{ padding: '4rem', color: '#475569', fontWeight: 600 }}>Loading treatment cards…</div>
          ) : (
            pages.map((pair, idx) => (
              <div
                key={idx}
                className="batch-sheet"
                style={{
                  width: `${size.width}mm`,
                  height: `${size.height}mm`,
                  background: '#fff',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                  boxSizing: 'border-box',
                  flexShrink: 0,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {renderHalf(pair[0], 'top')}
                {renderHalf(pair[1], 'bottom')}
                <span
                  style={{
                    position: 'absolute',
                    top: `${halfHeight}mm`,
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: '#fff',
                    padding: '0 6px',
                    fontSize: '7pt',
                    color: '#6b7280',
                    fontFamily: 'Arial, sans-serif',
                    lineHeight: '12px',
                  }}
                >
                  ✂ cut here
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="no-print" style={{ padding: '10px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {items.length % 2 === 1 ? 'Odd number of cards — the bottom half of the last sheet is left empty.' : 'Cut along the dashed line to separate the cards.'}
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#334155', fontWeight: 600, fontSize: '0.85rem', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || cards.length === 0}
              onClick={() => { void printWhenReady(window); }}
              style={{
                background: loading || cards.length === 0 ? '#94a3b8' : '#16a34a',
                border: 'none',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.85rem',
                padding: '8px 18px',
                borderRadius: '8px',
                cursor: loading || cards.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <HugeiconsIcon icon={PrinterIcon} size={16} />
              Print {cards.length} card{cards.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
