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
  station_id?: number | null;
  station?: { id: number; name: string } | null;
  served_by?: number | null;
  servedBy?: { id: number; name: string; role?: string } | null;
}

const VISIT_LABEL: Record<string, string> = {
  new_case:    'New Case',
  follow_up:   'Follow-up',
  vaccination: 'Vaccination',
  observation: 'Observation',
  booster:     'Booster request',
};

// A booster request remains with the Doctor until assessment approval. Only
// treatment-ready vaccinations and scheduled follow-up doses appear on the
// nursing side of the public display.
const TREATMENT_TYPES = new Set(['vaccination', 'follow_up', 'observation']);

function isFollowUpEntry(entry: QueueEntry): boolean {
  const stationName = (entry.station?.name || '').toLowerCase();
  if (stationName.includes('follow-up') || stationName.includes('station 2')) return true;
  if (stationName.includes('intake') || stationName.includes('station 1')) return false;
  return entry.visit_type === 'follow_up';
}

function getDisplayLane(entry: QueueEntry): 'triage' | 'station1' | 'station2' {
  if (!TREATMENT_TYPES.has(entry.visit_type)) return 'triage';
  return isFollowUpEntry(entry) ? 'station2' : 'station1';
}

function waitTime(checkedIn: string): string {
  const diff = Math.floor((Date.now() - new Date(checkedIn).getTime()) / 60_000);
  if (diff < 1) return '< 1 min';
  if (diff < 60) return `${diff} min`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
}

function padNum(n: number) { return String(n).padStart(3, '0'); }

// ─── Sub-Station Card for Treatment Area (HCI Optimized) ─────────

interface SubStationCardProps {
  stationNumber: 1 | 2;
  title: string;
  subtitle: string;
  accentColor: string;
  accentDark: string;
  gradient: string;
  current: QueueEntry | null;
  blink: boolean;
}

function SubStationCard({
  stationNumber,
  title,
  subtitle,
  accentColor,
  accentDark,
  gradient,
  current,
  blink,
}: SubStationCardProps) {
  const isServing = !!current;

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 18,
      overflow: 'hidden',
      border: isServing ? `2.5px solid ${accentColor}` : '2px solid #e2e8f0',
      background: '#ffffff',
      boxShadow: isServing ? `0 8px 24px ${accentColor}28` : '0 1px 3px rgba(0,0,0,0.03)',
      transition: 'all 0.3s ease',
    }}>
      {/* Card Header — Clear Categorization */}
      <div style={{
        padding: '12px 18px',
        background: isServing ? `${accentColor}12` : '#f8fafc',
        borderBottom: `1.5px solid ${isServing ? accentColor + '30' : '#e2e8f0'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: accentColor,
            boxShadow: isServing ? `0 0 10px ${accentColor}` : 'none',
          }} />
          <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1.5, color: accentDark, textTransform: 'uppercase' }}>
            {title}
          </span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: accentDark, opacity: 0.85 }}>
          {subtitle}
        </span>
      </div>

      {/* Card Body — Visual Hierarchy Focused */}
      <div style={{
        flex: 1,
        padding: '24px 18px',
        background: isServing ? gradient : '#ffffff',
        color: isServing ? '#ffffff' : '#64748b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: 250,
        position: 'relative',
      }}>
        {/* Label: NOW SERVING */}
        <div style={{
          fontSize: 13,
          fontWeight: 900,
          letterSpacing: 2.5,
          textTransform: 'uppercase',
          color: isServing ? 'rgba(255,255,255,0.9)' : '#94a3b8',
          marginBottom: 4,
        }}>
          NOW SERVING
        </div>

        {isServing ? (
          <>
            {/* Primary Level: Giant Calling Number */}
            <div style={{
              fontSize: 118,
              fontWeight: 900,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: -4,
              color: blink ? '#ffffff' : 'rgba(255,255,255,0.72)',
              textShadow: '0 4px 18px rgba(0,0,0,0.22)',
              margin: '2px 0 6px',
              transition: 'color 0.3s ease',
            }}>
              {padNum(current.queue_number)}
            </div>

            {/* Secondary Level: Patient Name */}
            <div style={{
              fontSize: 24,
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.25,
              maxWidth: '92%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textShadow: '0 2px 8px rgba(0,0,0,0.18)',
            }}>
              {current.patient.name}
            </div>

            {/* Action Level: Directional Pill */}
            <div style={{
              marginTop: 16,
              padding: '10px 22px',
              borderRadius: 999,
              background: '#ffffff',
              boxShadow: '0 4px 14px rgba(0,0,0,0.16)',
              fontSize: 14,
              fontWeight: 900,
              color: accentDark,
              letterSpacing: 0.4,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span>➔</span>
              <span>PROCEED TO STATION {stationNumber} DESK</span>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: 0.8 }}>
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8">
              <path d="M19 5L5 19M14 4l6 6M4 14l6 6M3 21l3-3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>
              No {stationNumber === 1 ? 'Intake' : 'Follow-up'} Patient
            </span>
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
              Station {stationNumber} ready for next call
            </span>
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

      // Auto-call independently for Doctor, Station 1, and Station 2. One busy
      // nurse must never hold the other treatment station's queue.
      // and there's a waiting patient, call them automatically
      for (const lane of ['triage', 'station1', 'station2'] as const) {
        const inConsult = entries.find(e => ACTIVE_STATUSES.includes(e.status) && getDisplayLane(e) === lane);
        if (inConsult) continue; // station already has an active patient

        const nextWaiting = entries.find(e => e.status === 'waiting' && getDisplayLane(e) === lane);
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

  // 1. Triage (Doctor)
  const triageWaiting    = queue.filter(q => q.status === 'waiting' && getDisplayLane(q) === 'triage');
  const triageInConsult  = queue.find(q => ACTIVE(q.status) && getDisplayLane(q) === 'triage') ?? null;
  const triageCurrent    = triageInConsult ?? triageWaiting[0] ?? null;
  const triageNext       = triageInConsult ? (triageWaiting[0] ?? null) : (triageWaiting[1] ?? null);

  // 2. Treatment (Nurses): Divided into Station 1 (Intake) and Station 2 (Follow-up)
  const treatmentEntries = queue.filter(q => getDisplayLane(q) !== 'triage');
  const treatmentWaiting = treatmentEntries.filter(q => q.status === 'waiting');

  // Station 1 — Intake
  const st1Waiting   = treatmentWaiting.filter(q => getDisplayLane(q) === 'station1');
  const st1InConsult = treatmentEntries.find(q => ACTIVE(q.status) && getDisplayLane(q) === 'station1') ?? null;
  const st1Current   = st1InConsult ?? st1Waiting[0] ?? null;

  // Station 2 — Follow-up
  const st2Waiting   = treatmentWaiting.filter(q => getDisplayLane(q) === 'station2');
  const st2InConsult = treatmentEntries.find(q => ACTIVE(q.status) && getDisplayLane(q) === 'station2') ?? null;
  const st2Current   = st2InConsult ?? st2Waiting[0] ?? null;

  const clinicName = (() => {
    try { return JSON.parse(localStorage.getItem('clinicData') ?? '{}')?.name ?? 'Animal Bite Center'; }
    catch { return 'Animal Bite Center'; }
  })();

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div style={{
      height: '100vh',
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      color: '#0f172a',
      overflow: 'hidden',
    }}>

      {/* ── Top Bar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 40px',
        borderBottom: '2px solid #064e3b',
        background: '#047857',
        boxShadow: '0 3px 12px rgba(4,120,87,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, background: '#ffffff', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.4">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', letterSpacing: -0.3 }}>
              {clinicName}
            </div>
            <div style={{ fontSize: 13, color: '#a7f3d0', fontWeight: 600 }}>
              Queue Calling Display — Animal Bite Treatment Center
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 38, fontWeight: 900, color: '#ffffff', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {timeStr}
          </div>
          <div style={{ fontSize: 13, color: '#a7f3d0', fontWeight: 600, marginTop: 4 }}>
            {dateStr}
          </div>
        </div>
      </div>

      {/* ── Instruction Banner ── */}
      <div style={{
        textAlign: 'center',
        padding: '11px 36px',
        background: '#ecfdf5',
        borderBottom: '1.5px solid #a7f3d0',
        fontSize: 15,
        color: '#064e3b',
        fontWeight: 800,
        letterSpacing: 0.6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>🔔</span>
        <span>PLEASE LISTEN FOR YOUR NUMBER AND PROCEED TO THE ASSIGNED STATION</span>
      </div>

      {/* ── Two Column Master Layout ── */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '0.95fr 1.05fr',
        gap: 18,
        padding: '16px 24px',
        overflow: 'hidden',
        minHeight: 0,
      }}>

        {/* ════ LEFT COLUMN: TRIAGE / DOCTOR ════ */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          minHeight: 0,
        }}>
          {/* Station Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderRadius: 14,
            background: 'rgba(37, 99, 235, 0.08)',
            border: '2px solid #2563eb',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#2563eb', boxShadow: '0 0 10px #2563eb' }} />
              <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1.8, color: '#1e3a8a', textTransform: 'uppercase' }}>
                TRIAGE / DOCTOR (CONSULTATION)
              </span>
            </div>
            <span style={{
              fontSize: 13, fontWeight: 800, color: '#1e40af',
              background: 'rgba(37, 99, 235, 0.15)', padding: '4px 14px', borderRadius: 999,
              border: '1px solid #2563eb',
            }}>
              {triageWaiting.length} waiting
            </span>
          </div>

          {/* Doctor Calling Card */}
          <div style={{
            flex: 1,
            borderRadius: 20,
            padding: '28px 32px',
            background: triageCurrent
              ? 'linear-gradient(145deg, #1e3a8a 0%, #2563eb 100%)'
              : '#ffffff',
            border: triageCurrent ? '2.5px solid #1d4ed8' : '2px solid #e2e8f0',
            boxShadow: triageCurrent ? '0 10px 32px rgba(37,99,235,0.28)' : '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            overflow: 'hidden',
            minHeight: 290,
          }}>
            <div style={{
              fontSize: 13, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase',
              color: triageCurrent ? 'rgba(255,255,255,0.9)' : '#94a3b8',
              marginBottom: 4,
            }}>
              NOW SERVING
            </div>

            {triageCurrent ? (
              <>
                <div style={{
                  fontSize: 142,
                  fontWeight: 900,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: -5,
                  color: blink ? '#ffffff' : 'rgba(255,255,255,0.72)',
                  textShadow: '0 6px 24px rgba(0,0,0,0.25)',
                  transition: 'color 0.3s ease',
                  margin: '4px 0 8px',
                }}>
                  {padNum(triageCurrent.queue_number)}
                </div>

                <div style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1.25,
                  maxWidth: '92%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                }}>
                  {triageCurrent.patient.name}
                </div>

                <div style={{
                  marginTop: 18,
                  padding: '10px 24px',
                  borderRadius: 999,
                  background: '#ffffff',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                  fontSize: 15,
                  fontWeight: 900,
                  color: '#1e3a8a',
                  letterSpacing: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span>➔</span>
                  <span>PROCEED TO DOCTOR'S ROOM</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: 0.75 }}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.6">
                  <path d="M4.5 3h15M12 3v18M8 21h8" strokeLinecap="round"/>
                </svg>
                <div style={{ fontSize: 18, color: '#334155', fontWeight: 800 }}>No Patient at Triage</div>
                <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>Doctor consultation desk is available</div>
              </div>
            )}
          </div>

          {/* Doctor Next Up Box */}
          <div style={{
            borderRadius: 16,
            padding: '14px 20px',
            background: triageNext ? 'rgba(37,99,235,0.07)' : '#ffffff',
            border: `2px solid ${triageNext ? '#93c5fd' : '#e2e8f0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.8, textTransform: 'uppercase', color: '#1e40af' }}>
                Next for Triage
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, color: triageNext ? '#1e3a8a' : '#94a3b8', lineHeight: 1.1, marginTop: 2 }}>
                {triageNext ? `#${padNum(triageNext.queue_number)}` : '— None'}
              </div>
              {triageNext && (
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                  {triageNext.patient.name}
                </div>
              )}
            </div>
            {triageWaiting.length > 1 && (
              <div style={{ fontSize: 12, fontWeight: 800, color: '#1e40af', background: 'rgba(37,99,235,0.12)', padding: '5px 12px', borderRadius: 8 }}>
                +{triageWaiting.length - 1} more waiting
              </div>
            )}
          </div>
        </div>

        {/* ════ RIGHT COLUMN: TREATMENT & VACCINATION (DUAL NURSES) ════ */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          minHeight: 0,
        }}>
          {/* Section Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderRadius: 14,
            background: 'rgba(5, 150, 105, 0.08)',
            border: '2px solid #059669',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#059669', boxShadow: '0 0 10px #059669' }} />
              <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1.8, color: '#064e3b', textTransform: 'uppercase' }}>
                TREATMENT & VACCINATIONS (NURSING WING)
              </span>
            </div>
            <span style={{
              fontSize: 13, fontWeight: 800, color: '#064e3b',
              background: 'rgba(5, 150, 105, 0.15)', padding: '4px 14px', borderRadius: 999,
              border: '1px solid #059669',
            }}>
              {treatmentWaiting.length} waiting
            </span>
          </div>

          {/* DUAL STATIONS: Station 1 (Intake) and Station 2 (Follow-up) Side-by-Side */}
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
            minHeight: 0,
          }}>
            {/* Station 1: Intake — Medical Emerald Green */}
            <SubStationCard
              stationNumber={1}
              title="STATION 1 · INTAKE"
              subtitle="Doctor-approved Day 0 & one booster"
              accentColor="#059669"
              accentDark="#064e3b"
              gradient="linear-gradient(145deg, #064e3b 0%, #059669 100%)"
              current={st1Current}
              blink={blink}
            />

            {/* Station 2: Follow-up — Matching Medical Deep Teal */}
            <SubStationCard
              stationNumber={2}
              title="STATION 2 · FOLLOW-UP"
              subtitle="Scheduled Day 3, 7 & Later Doses"
              accentColor="#6366f1"
              accentDark="#3730a3"
              gradient="linear-gradient(145deg, #3730a3 0%, #6366f1 100%)"
              current={st2Current}
              blink={blink}
            />
          </div>

          {/* Up Next for Treatment Bar */}
          <div style={{
            borderRadius: 16,
            padding: '14px 20px',
            background: '#ffffff',
            border: '2px solid #e2e8f0',
            flexShrink: 0,
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#334155',
              marginBottom: 8,
            }}>
              UP NEXT FOR TREATMENT
            </div>

            {treatmentWaiting.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {treatmentWaiting.slice(0, 3).map((e) => {
                  const isFollowUp = isFollowUpEntry(e);
                  return (
                    <div
                      key={e.queue_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        padding: '6px 14px',
                        borderRadius: 10,
                      }}
                    >
                      <span style={{
                        fontSize: 18,
                        fontWeight: 900,
                        color: isFollowUp ? '#6366f1' : '#059669',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        #{padNum(e.queue_number)}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                        {e.patient.name}
                      </span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: isFollowUp ? '#e0e7ff' : '#d1fae5',
                        color: isFollowUp ? '#3730a3' : '#064e3b',
                      }}>
                        {isFollowUp ? 'Follow-up' : 'Intake'}
                      </span>
                    </div>
                  );
                })}
                {treatmentWaiting.length > 3 && (
                  <span style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}>
                    +{treatmentWaiting.length - 3} more waiting
                  </span>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', fontWeight: 500 }}>
                No additional patients currently waiting in treatment queue
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Ticker ── */}
      <div style={{
        background: '#10b981',
        padding: '10px 36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 12,
        fontWeight: 600,
        color: '#ffffff',
        borderTop: '1px solid #059669',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.04)',
      }}>
        <span>🔔 Auto-refreshes every 5 seconds</span>
        <span>
          Triage: {triageWaiting.length} waiting
          &nbsp;·&nbsp;
          Station 1 (Intake): {st1Waiting.length} waiting
          &nbsp;·&nbsp;
          Station 2 (Follow-up): {st2Waiting.length} waiting
          &nbsp;·&nbsp;
          {queue.filter(q => q.status === 'completed').length} completed today
        </span>
        <a href="/queue" style={{ color: '#d1fae5', textDecoration: 'none', fontWeight: 700 }}>
          ← Back to Dashboard
        </a>
      </div>

      {/* ── Voice / Chime Announcement Banner Overlay ── */}
      {lastCall && (
        <div style={{
          position: 'fixed',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 16,
          padding: '16px 36px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
          zIndex: 9999,
          textAlign: 'center',
          animation: 'slideDown 0.3s ease',
          minWidth: 320,
          border: '1.5px solid #334155',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#94a3b8' }}>
            NOW CALLING
          </div>
          <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, color: '#38bdf8', fontVariantNumeric: 'tabular-nums', margin: '4px 0' }}>
            #{padNum(lastCall.queue_number)}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
            {lastCall.patient.name}
          </div>
          <div style={{ fontSize: 13, color: '#a7f3d0', fontWeight: 600, marginTop: 4 }}>
            ➔ Please proceed to {getDisplayLane(lastCall) === 'triage'
              ? "Doctor's Room"
              : getDisplayLane(lastCall) === 'station2'
                ? "Treatment Station 2 (Scheduled Follow-up)"
                : "Treatment Station 1 (Day 0 Treatment)"}
          </div>
          <button
            onClick={() => setLastCall(null)}
            style={{
              marginTop: 10,
              padding: '5px 16px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }
      `}</style>
    </div>
  );
}
