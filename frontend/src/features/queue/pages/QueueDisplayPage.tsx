import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../services/api';

// ─── Types ────────────────────────────────────────────────────

interface QueueEntry {
  queue_id: number;
  queue_number: number;
  visit_type: string;
  priority: 'normal' | 'urgent' | 'emergency';
  status: 'waiting' | 'called' | 'serving' | 'in_consultation' | 'completed' | 'cancelled';
  checked_in_at: string;
  patient: { name: string; age: number; gender: string };
}

const VISIT_LABEL: Record<string, string> = {
  new_case:    'New Case',
  follow_up:   'Follow-up',
  vaccination: 'Vaccination',
  observation: 'Observation',
};

// Treatment station handles vaccinations and observations; everything else goes to triage
const TREATMENT_TYPES = new Set(['vaccination', 'observation']);

function getStation(visitType: string): 'triage' | 'treatment' {
  return TREATMENT_TYPES.has(visitType) ? 'treatment' : 'triage';
}

function waitTime(checkedIn: string): string {
  const diff = Math.floor((Date.now() - new Date(checkedIn).getTime()) / 60_000);
  if (diff < 1) return '< 1 min';
  if (diff < 60) return `${diff} min`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
}

function padNum(n: number) { return String(n).padStart(3, '0'); }

// ─── Station Panel ────────────────────────────────────────────

interface StationPanelProps {
  station:        'triage' | 'treatment';
  current:        QueueEntry | null;
  next:           QueueEntry | null;
  waitingCount:   number;
  blink:          boolean;
}

function StationPanel({
  station, current, next, waitingCount, blink,
}: StationPanelProps) {
  const isTriage   = station === 'triage';
  const accent     = isTriage ? '#0ea5e9' : '#f59e0b';   // blue for triage, amber for treatment
  const accentDark = isTriage ? '#0369a1' : '#b45309';
  const label      = isTriage ? 'TRIAGE / DOCTOR' : 'TREATMENT / VACCINATION';
  const destination = isTriage
    ? 'Please proceed to Triage Room'
    : 'Please proceed to Treatment Area';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 16, flex: 1,
    }}>
      {/* Station header badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 18px', borderRadius: 12,
        background: `${accent}18`, border: `2px solid ${accent}`,
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: accent, boxShadow: `0 0 8px ${accent}`,
        }} />
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: accentDark, textTransform: 'uppercase' }}>
          {label}
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: accentDark,
          background: `${accent}25`, padding: '2px 12px', borderRadius: 999,
          border: `1px solid ${accent}`,
        }}>
          {waitingCount} waiting
        </span>
      </div>

      {/* Next Patient card */}
      <div style={{
        flex: 1, borderRadius: 20, padding: '28px 32px',
        background: current
          ? `linear-gradient(135deg, ${accentDark} 0%, ${accent} 100%)`
          : '#f9fafb',
        border: `2px solid ${current ? accent : '#e5e7eb'}`,
        boxShadow: current ? `0 4px 24px ${accent}44` : 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center', minHeight: 260,
        transition: 'all 0.4s',
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase',
          color: current ? 'rgba(255,255,255,0.85)' : accentDark,
          marginBottom: 10,
        }}>
          Next Patient
        </div>

        {current ? (
          <>
            {/* Big blinking number */}
            <div style={{
              fontSize: 100, fontWeight: 900, lineHeight: 1,
              color: blink ? '#fff' : 'rgba(255,255,255,0.7)',
              fontVariantNumeric: 'tabular-nums',
              textShadow: `0 4px 20px rgba(0,0,0,0.3)`,
              transition: 'color 0.4s',
            }}>
              {padNum(current.queue_number)}
            </div>

            {/* Announcement text */}
            <div style={{
              marginTop: 10, padding: '8px 20px', borderRadius: 10,
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)',
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                Number {padNum(current.queue_number)} — {destination}
              </span>
            </div>

            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 10 }}>
              {current.patient.name}
              {' · '}
              {VISIT_LABEL[current.visit_type] ?? current.visit_type}
            </div>

            {current.priority !== 'normal' && (
              <div style={{
                marginTop: 8, padding: '3px 12px', borderRadius: 20,
                background: current.priority === 'emergency' ? '#dc2626' : '#f59e0b',
                fontSize: 12, fontWeight: 700, display: 'inline-block', color: '#fff',
              }}>
                {current.priority.toUpperCase()}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 64, marginBottom: 8, color: '#d1d5db' }}>—</div>
            <div style={{ fontSize: 15, color: '#6b7280', fontWeight: 500 }}>No patient at {isTriage ? 'triage' : 'treatment'}</div>
          </>
        )}
      </div>

      {/* Next up */}
      <div style={{
        borderRadius: 16, padding: '18px 24px',
        background: next ? `${accent}12` : '#f3f4f6',
        border: `1.5px solid ${next ? accent : '#e5e7eb'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: accentDark, marginBottom: 4 }}>
            Next
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: next ? accentDark : '#9ca3af' }}>
            {next ? padNum(next.queue_number) : '—'}
          </div>
          {next && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {next.patient.name} · {VISIT_LABEL[next.visit_type] ?? next.visit_type}
            </div>
          )}
        </div>

        {next && (
          <div style={{
            flexShrink: 0, padding: '10px 20px', borderRadius: 10,
            background: `${accent}18`, border: `1.5px solid ${accent}44`,
            display: 'inline-flex', alignItems: 'center', gap: 7,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: accentDark }}>Up next</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function QueueDisplayPage() {
  const [now, setNow]         = useState(new Date());
  const [queue, setQueue]     = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [blink, setBlink]     = useState(true);
  const [lastCall, setLastCall] = useState<QueueEntry | null>(null);
  const prevCalledRef  = useRef<Set<number>>(new Set());
  const autoCallingRef = useRef<Set<number>>(new Set()); // guard against duplicate auto-calls
  const audioCtxRef   = useRef<AudioContext | null>(null);

  // Clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Blink
  useEffect(() => {
    const id = setInterval(() => setBlink(b => !b), 800);
    return () => clearInterval(id);
  }, []);

  // Chime
  const playChime = useCallback(() => {
    try {
      if (!audioCtxRef.current)
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = 'sine';
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.18 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.35);
        osc.start(ctx.currentTime + i * 0.18);
        osc.stop(ctx.currentTime + i * 0.18 + 0.36);
      });
    } catch { /* ignore */ }
  }, []);

  // Load queue + auto-call next patient when a station slot is free
  const loadQueue = useCallback(async () => {
    try {
      const res = await api.get('/queue');
      const entries: QueueEntry[] = res.data.queue ?? [];
      setQueue(entries);

      // Chime notification for newly active (called/serving) patients
      const ACTIVE_STATUSES = ['called', 'serving', 'in_consultation'];
      const nowCalled = new Set(entries.filter(e => ACTIVE_STATUSES.includes(e.status)).map(e => e.queue_id));
      const newlyCalled = entries.find(e => ACTIVE_STATUSES.includes(e.status) && !prevCalledRef.current.has(e.queue_id));
      if (newlyCalled) { setLastCall(newlyCalled); playChime(); }
      prevCalledRef.current = nowCalled;

      // Auto-call: for each station, if no one is active (called/serving/in_consultation)
      // and there's a waiting patient, call them automatically
      for (const station of ['triage', 'treatment'] as const) {
        const inConsult = entries.find(e => ACTIVE_STATUSES.includes(e.status) && getStation(e.visit_type) === station);
        if (inConsult) continue; // station already has an active patient

        const nextWaiting = entries.find(e => e.status === 'waiting' && getStation(e.visit_type) === station);
        if (!nextWaiting) continue; // nobody waiting

        // Skip if we're already mid-call for this entry (prevents duplicate POSTs across polls)
        if (autoCallingRef.current.has(nextWaiting.queue_id)) continue;

        autoCallingRef.current.add(nextWaiting.queue_id);
        api.post(`/queue/${nextWaiting.queue_id}/call`)
          .then(() => playChime())
          .catch(() => {/* ignore — next poll will retry if still needed */})
          .finally(() => autoCallingRef.current.delete(nextWaiting.queue_id));
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [playChime]);

  useEffect(() => {
    loadQueue();
    const id = setInterval(loadQueue, 5_000); // poll every 5s
    return () => clearInterval(id);
  }, [loadQueue]);

  // Active statuses = patient is at or being directed to the station
  const ACTIVE = (s: string) => ['called', 'serving', 'in_consultation'].includes(s);

  // Split queue by station
  const triageWaiting    = queue.filter(q => q.status === 'waiting' && getStation(q.visit_type) === 'triage');
  const treatmentWaiting = queue.filter(q => q.status === 'waiting' && getStation(q.visit_type) === 'treatment');
  const triageInConsult    = queue.find(q => ACTIVE(q.status) && getStation(q.visit_type) === 'triage') ?? null;
  const treatmentInConsult = queue.find(q => ACTIVE(q.status) && getStation(q.visit_type) === 'treatment') ?? null;

  // "current" = in_consultation if exists, otherwise show first waiting so the display is never blank
  const triageCurrent    = triageInConsult    ?? triageWaiting[0]    ?? null;
  const treatmentCurrent = treatmentInConsult ?? treatmentWaiting[0] ?? null;

  // "next" = second waiting patient (skip first if shown as current)
  const triageNext    = triageInConsult    ? triageWaiting[0]    ?? null : triageWaiting[1]    ?? null;
  const treatmentNext = treatmentInConsult ? treatmentWaiting[0] ?? null : treatmentWaiting[1] ?? null;

  const clinicName = (() => {
    try { return JSON.parse(localStorage.getItem('clinicData') ?? '{}')?.name ?? 'Animal Bite Center'; }
    catch { return 'Animal Bite Center'; }
  })();

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#111827', overflow: 'hidden',
    }}>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 40px', borderBottom: '1px solid #e5e7eb',
        background: '#10b981',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{clinicName}</div>
            <div style={{ fontSize: 11, color: '#d1fae5' }}>Animal Bite Treatment Center · Queue Calling Display</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{timeStr}</div>
          <div style={{ fontSize: 12, color: '#d1fae5' }}>{dateStr}</div>
        </div>
      </div>

      {/* ── Instruction banner ── */}
      <div style={{
        textAlign: 'center', padding: '10px 40px',
        background: '#f0fdf4', borderBottom: '1px solid #bbf7d0',
        fontSize: 14, color: '#065f46', fontWeight: 600, letterSpacing: 1,
      }}>
        🔔 Please listen for your number and proceed to the assigned station
      </div>

      {/* ── Two station panels ── */}
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 1, padding: 0,
      }}>

        {/* Triage Station */}
        <div style={{
          padding: '28px 32px',
          borderRight: '1px solid #e5e7eb',
          background: '#fff',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
      <StationPanel
            station="triage"
            current={triageCurrent}
            next={triageNext}
            waitingCount={triageWaiting.length}
            blink={blink}
          />

          {/* Triage waiting mini list */}
          {triageWaiting.length > 1 && (
            <div style={{ borderRadius: 14, padding: '14px 18px', background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#0ea5e9', marginBottom: 10, textTransform: 'uppercase' }}>Also Waiting for Triage</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {triageWaiting.slice(1, 6).map(e => (
                  <div key={e.queue_id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                    <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#0ea5e9', minWidth: 36 }}>#{padNum(e.queue_number)}</span>
                    <span style={{ color: '#d1d5db', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.patient.name}</span>
                    <span style={{ color: '#6b7280', fontSize: 11 }}>{waitTime(e.checked_in_at)}</span>
                  </div>
                ))}
                {triageWaiting.length > 6 && <div style={{ fontSize: 11, color: '#6b7280' }}>+{triageWaiting.length - 6} more</div>}
              </div>
            </div>
          )}
        </div>

        {/* Treatment Station */}
        <div style={{
          padding: '28px 32px',
          background: '#fff',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <StationPanel
            station="treatment"
            current={treatmentCurrent}
            next={treatmentNext}
            waitingCount={treatmentWaiting.length}
            blink={blink}
          />

          {/* Treatment waiting mini list */}
          {treatmentWaiting.length > 1 && (
            <div style={{ borderRadius: 14, padding: '14px 18px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#f59e0b', marginBottom: 10, textTransform: 'uppercase' }}>Also Waiting for Treatment</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {treatmentWaiting.slice(1, 6).map(e => (
                  <div key={e.queue_id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                    <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#f59e0b', minWidth: 36 }}>#{padNum(e.queue_number)}</span>
                    <span style={{ color: '#d1d5db', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.patient.name}</span>
                    <span style={{ color: '#6b7280', fontSize: 11 }}>{waitTime(e.checked_in_at)}</span>
                  </div>
                ))}
                {treatmentWaiting.length > 6 && <div style={{ fontSize: 11, color: '#6b7280' }}>+{treatmentWaiting.length - 6} more</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom ticker ── */}
      <div style={{
        background: '#10b981', padding: '9px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 12, fontWeight: 600, color: '#fff',
        borderTop: '1px solid #059669',
      }}>
        <span>🔔 Auto-refreshes every 5 seconds</span>
        <span>
          Triage: {triageWaiting.length} waiting
          &nbsp;·&nbsp;
          Treatment: {treatmentWaiting.length} waiting
          &nbsp;·&nbsp;
          {queue.filter(q => q.status === 'completed').length} completed today
        </span>
        <a href="/queue" style={{ color: '#6ee7b7', textDecoration: 'none' }}>← Back to Queue Dashboard</a>
      </div>

      {/* ── Call notification overlay ── */}
      {lastCall && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: `linear-gradient(135deg, ${getStation(lastCall.visit_type) === 'triage' ? '#0ea5e9, #0369a1' : '#f59e0b, #b45309'})`,
          borderRadius: 16, padding: '16px 36px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 9999, textAlign: 'center',
          animation: 'slideDown 0.3s ease',
          minWidth: 300,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.85 }}>Now Calling</div>
          <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            #{padNum(lastCall.queue_number)}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{lastCall.patient.name}</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
            {getStation(lastCall.visit_type) === 'triage'
              ? '→ Please proceed to Triage Room'
              : '→ Please proceed to Treatment Area'}
          </div>
          <button onClick={() => setLastCall(null)} style={{
            marginTop: 12, padding: '6px 20px', borderRadius: 8,
            background: 'rgba(255,255,255,0.2)', border: 'none',
            color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>Dismiss</button>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
      `}</style>
    </div>
  );
}
