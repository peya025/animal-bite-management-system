import { useState, type ReactNode } from 'react';
import { Box, Chip, Typography, CircularProgress, Collapse, Button } from '@mui/material';
import { Icon } from '../../../shared/components/ui/Icon';
import DohTransferSlipModal from '../../vaccinations/components/DohTransferSlipModal';

/**
 * One summary card per assessment, with its own administration status and
 * printable treatment form. Full clinical details are collapsed initially;
 * exposure information and follow-up schedules remain below the card list.
 */

interface PatientHistoryInlineViewProps {
  patient: any;
  cardData: any;
  loading?: boolean;
  registrationContent?: ReactNode;
  onOpenTab?: (tabKey: string) => void;
  onOpenTreatmentCard?: (assessmentTreatmentId?: number) => void;
}

type Tone = 'green' | 'red' | 'amber' | 'blue' | 'gray';

const TONE: Record<Tone, { bg: string; fg: string; bd: string }> = {
  green: { bg: '#ecfdf5', fg: '#047857', bd: '#a7f3d0' },
  red: { bg: '#fef2f2', fg: '#b91c1c', bd: '#fecaca' },
  amber: { bg: '#fffbeb', fg: '#b45309', bd: '#fde68a' },
  blue: { bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe' },
  gray: { bg: '#f1f5f9', fg: '#475569', bd: '#e2e8f0' },
};

const PROPHYLAXIS_LABELS: Record<number, string> = {
  200: 'ERIG',
  201: 'HRIG',
  300: 'Tetanus Toxoid (TT)',
  400: 'Anti-Tetanus Serum (ATS)',
  401: 'Tetanus Immunoglobulin (TIG)',
};

const UPCOMING_STATUSES = ['scheduled', 'confirmed', 'pending', 'booked', 'rescheduled'];

const doseLabel = (n: any) => (Number(n) >= 90 ? 'Booster' : `Day ${Number(n)}`);

const toDay = (v: any): string | null => {
  if (!v) return null;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const fmtDay = (day?: string | null) => {
  if (!day) return '—';
  const d = new Date(`${day}T00:00:00`);
  return isNaN(d.getTime())
    ? day
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const nurseOf = (r: any): string | null => {
  const a = r?.administered_by;
  if (a && typeof a === 'object') return a.name || null;
  return r?.administeredBy?.name || r?.administered_by_user?.name || r?.administered_by_name || null;
};

function StatusChip({ label, tone }: { label: string; tone: Tone }) {
  const t = TONE[tone];
  return (
    <Chip
      label={label}
      size="small"
      sx={{ bgcolor: t.bg, color: t.fg, border: `1px solid ${t.bd}`, fontWeight: 500, fontSize: 13, height: 25 }}
    />
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <span
        style={{
          color: 'var(--text-m, #64748b)',
          fontSize: 10.5,
          display: 'block',
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          fontWeight: 600,
          marginBottom: 2,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, color: 'var(--text-h, #0f172a)', fontWeight: 600 }}>{value || '—'}</span>
    </div>
  );
}

function Notice({ tone, title, children }: { tone: Tone; title: string; children?: ReactNode }) {
  const t = TONE[tone];
  return (
    <Box sx={{ p: 1.25, bgcolor: t.bg, border: `1px solid ${t.bd}`, borderRadius: 1.5 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: t.fg }}>{title}</Typography>
      {children && <Typography sx={{ fontSize: 12, color: t.fg, mt: 0.25, opacity: 0.9 }}>{children}</Typography>}
    </Box>
  );
}

function ToggleArrow({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        fontSize: 11,
        color: '#64748b',
        display: 'inline-block',
        transform: open ? 'rotate(180deg)' : 'none',
        transition: 'transform 0.15s',
      }}
    >
      ▼
    </span>
  );
}

const clickableProps = (onToggle: () => void) => ({
  role: 'button' as const,
  tabIndex: 0,
  onClick: onToggle,
  onKeyDown: (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  },
});

export function PatientHistoryInlineView({
  patient,
  cardData,
  loading = false,
  registrationContent,
  onOpenTab,
  onOpenTreatmentCard,
}: PatientHistoryInlineViewProps) {
  const [selectedReferralSlip, setSelectedReferralSlip] = useState<any | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    form1: false, // Default collapsed to keep focus on clinical assessments
    followups: true,
  });

  const toggle = (key: string, defaultOpen = true) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? !defaultOpen : !prev[key],
    }));
  };

  const isOpen = (key: string, defaultOpen = true) =>
    openSections[key] === undefined ? defaultOpen : Boolean(openSections[key]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
        <CircularProgress size={22} sx={{ color: '#10b981' }} />
        <Typography sx={{ color: '#6b7280', fontSize: 13 }}>Loading treatment history…</Typography>
      </Box>
    );
  }

  const p = patient || {};
  const cData = cardData || {};
  const bite = cData.bite_incident || p.bite_incidents?.[0] || p.biteIncidents?.[0] || null;
  const isReExposure = bite?.is_reexposure || bite?.exposure_type === 're_exposure';

  // Consultations derived from the treatment card service (each doctor consultation is its own discrete record)
  const consultations: any[] = cData.consultation_history || [];
  const latestCategory: string =
    cData.exposure_category ||
    consultations[consultations.length - 1]?.exposure_category ||
    p.exposure_category ||
    bite?.category ||
    '';
  const isCategory1 = String(latestCategory).toUpperCase() === 'I';

  // Vaccination progress tracking
  const givenDoseNumbers = new Set<number>();
  (p.vaccinationRecords || p.vaccination_records || []).forEach((r: any) => {
    if (r.dose_number !== null && r.dose_number !== undefined) {
      givenDoseNumbers.add(Number(r.dose_number));
    }
  });
  (cData.administered_doses || []).forEach((d: any) => {
    if (d.dose_number !== null && d.dose_number !== undefined) {
      givenDoseNumbers.add(Number(d.dose_number));
    }
  });

  const appointments: any[] = p.appointments || [];
  const upcomingAppointments = appointments
    .filter((a) => {
      const st = String(a.status || '').toLowerCase();
      const n = a.dose_number !== null && a.dose_number !== undefined ? Number(a.dose_number) : null;
      return UPCOMING_STATUSES.includes(st) && (n === null || !givenDoseNumbers.has(n));
    })
    .sort((a, b) => String(a.appointment_date).localeCompare(String(b.appointment_date)));

  const expectedDoses = [0, 3, 7];

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ p: { xs: 1.5, sm: 2 }, border: '1px solid var(--border-glow, #e2e8f0)', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: 2, bgcolor: 'var(--card-bg-solid, #ffffff)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography component="h2" sx={{ fontWeight: 600, fontSize: 19, color: 'var(--text-h, #0f172a)' }}>
            Patient Treatment History
          </Typography>
          <Chip label={bite ? '1 Bite Case' : 'No Bite Case'} size="small" sx={{ fontWeight: 500, bgcolor: 'var(--card-bg, #f1f5f9)', color: 'var(--text-h, #0f172a)' }} />
        </Box>

        {/* ── Group 2: Doctor Treatment Assessments (One Record per Assessment) ── */}
        {consultations.length === 0 ? (
          <Notice tone="gray" title="No Doctor Assessments Recorded Yet">
            Patient is registered in Form 1 and is currently in the Doctor Triage Queue awaiting initial clinical examination.
          </Notice>
        ) : (
          consultations.map((c: any, idx: number) => {
            const isReassessment = idx > 0 || Boolean(c.is_returning_reassessment || c.reassessment_decision);
            const adminStatus = c.administration_status || 'Pending Administration';
            const notAdminReason = c.not_administered_reason;
            const administeredItems: any[] = c.administered_items || [];
            const k = `assessment-${c.treatment_id || idx}`;
            const isAssOpen = isOpen(k, false);
            const isDocOpen = isOpen(`${k}:doctor`);
            const isTreatOpen = isOpen(`${k}:treatment`);

            let tone: Tone = 'amber';
            let accent = '#f59e0b';
            let statusBadgeText = 'Pending Administration';

            if (adminStatus === 'Administered') {
              tone = 'green';
              accent = '#10b981';
              statusBadgeText = 'Administered';
            } else if (adminStatus === 'Not Administered') {
              tone = 'amber';
              accent = '#f59e0b';
              statusBadgeText = 'Not Administered';
            } else if (adminStatus === 'Completed Without Injection') {
              tone = 'gray';
              accent = '#94a3b8';
              statusBadgeText = 'Completed Without Injection';
            } else if (adminStatus === 'Transferred/Referred') {
              tone = 'blue';
              accent = '#2563eb';
              statusBadgeText = 'Transferred/Referred';
            }

            const hasOrders = Boolean(c.prescribed_vaccine_type || c.prescribed_tt || c.prescribed_ats || c.prescribed_rig);

            const cardNumber = String(idx + 1).padStart(3, '0');
            const orders = [
              c.prescribed_vaccine_type ? 'Anti-rabies vaccine' : null,
              c.prescribed_tt ? 'TT' : null,
              c.prescribed_ats ? 'ATS' : null,
              c.prescribed_rig ? 'RIG' : null,
            ].filter(Boolean).join(', ');
            const orderSummary = c.reassessment_decision === 'continue'
              ? `Previous ${orders || 'treatment'} order confirmed`
              : orders ? `${orders} prescribed` : null;
            const given = [...new Set(administeredItems.map(item => item.type || item.product).filter(Boolean))].join(', ');
            const administrationSummary = adminStatus === 'Administered'
              ? given ? `${given} administered` : 'Treatment administered'
              : adminStatus === 'Not Administered' ? 'Injection not administered'
              : adminStatus === 'Completed Without Injection' ? 'Completed without injection'
              : adminStatus === 'Transferred/Referred' ? `Transferred/Referred to ${c.referred_to || 'External Facility'}`
              : 'Awaiting administration';

            return (
              <Box
                component="article"
                aria-labelledby={`${k}-title`}
                key={c.treatment_id || idx}
                sx={{
                  bgcolor: 'var(--card-bg-solid, #ffffff)',
                  border: '1px solid var(--border-glow, #e2e8f0)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ p: { xs: 1.75, sm: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                    <Typography id={`${k}-title`} component="h3" sx={{ fontWeight: 600, fontSize: 19, color: 'var(--text-h, #0f172a)' }}>
                      Treatment Card #{cardNumber}
                    </Typography>
                    <StatusChip tone={tone} label={statusBadgeText} />
                  </Box>
                  <Typography sx={{ mt: 1.25, fontSize: 14, color: 'var(--text-m, #64748b)' }}>
                    {fmtDay(toDay(c.consultation_date))} &bull; {isReassessment ? 'Reassessment' : 'Initial diagnosis'}
                  </Typography>
                  <Typography sx={{ mt: 1.25, fontSize: 16, lineHeight: 1.6, color: 'var(--text-h, #0f172a)' }}>
                    {[c.exposure_category ? `Category ${c.exposure_category}` : 'Category not recorded', orderSummary, administrationSummary].filter(Boolean).join(' \u2022 ')}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mt: 1.25, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      onClick={() => toggle(k, false)}
                      aria-expanded={isAssOpen}
                      aria-controls={`${k}-details`}
                      sx={{ textTransform: 'none', color: 'var(--text-m, #64748b)', fontSize: 12, px: 0.5 }}
                    >
                      {isAssOpen ? 'Hide details' : 'View details'}
                    </Button>
                    {onOpenTreatmentCard && (
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!c.treatment_id}
                        aria-label={`Print treatment card ${cardNumber}`}
                        startIcon={<Icon name="print" size={18} color="currentColor" />}
                        onClick={() => onOpenTreatmentCard(c.treatment_id)}
                        sx={{ borderRadius: '999px', px: 1.75, py: 0.4, fontSize: 14, fontWeight: 500, textTransform: 'none', color: 'var(--text-h, #0f172a)', borderColor: 'var(--border-glow, #d1d5db)' }}
                      >
                        Print card
                      </Button>
                    )}
                  </Box>
                    {(c.referred_to || adminStatus === 'Transferred/Referred' || c.outcome === 'Transferred/Referred') && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<Icon name="print" size={16} color="currentColor" />}
                        onClick={() => setSelectedReferralSlip(c)}
                        sx={{ borderRadius: '999px', px: 1.75, py: 0.4, fontSize: 13, fontWeight: 600, textTransform: 'none' }}
                      >
                        Print Referral Slip
                      </Button>
                    )}
                </Box>

                {/* Assessment Body (Collapsible) */}
                <Collapse id={`${k}-details`} in={isAssOpen} unmountOnExit>
                  <Box
                    sx={{
                      borderTop: '1px solid var(--border-glow, #e2e8f0)',
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.75,
                      bgcolor: 'var(--bg-secondary, #f9fafb)',
                    }}
                  >
                    {/* ── Sub-card 1: Doctor Diagnosis & Assessment ── */}
                    <Box
                      sx={{
                        bgcolor: 'var(--card-bg-solid, #ffffff)',
                        border: '1px solid #bfdbfe',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        {...clickableProps(() => toggle(`${k}:doctor`))}
                        aria-expanded={isDocOpen}
                        sx={{
                          px: 1.75,
                          py: 1.1,
                          bgcolor: '#eff6ff',
                          borderBottom: isDocOpen ? '1px solid #bfdbfe' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          userSelect: 'none',
                          '&:hover': { bgcolor: '#dbeafe' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Icon name="reports" size={16} color="#1e40af" />
                          <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1e40af' }}>
                            Clinical Examination &amp; Doctor Diagnosis
                          </Typography>
                          <Chip
                            label={`Dr. ${c.provider_name || 'Physician'}`}
                            size="small"
                            sx={{ height: 20, fontSize: 10.5, bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span style={{ fontSize: 11.5, color: '#1e40af', fontWeight: 700 }}>
                            {isDocOpen ? 'Hide Diagnosis' : 'Show Diagnosis'}
                          </span>
                          <ToggleArrow open={isDocOpen} />
                        </Box>
                      </Box>

                      <Collapse in={isDocOpen} unmountOnExit>
                        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {/* Vitals Grid */}
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                              gap: 1.25,
                              p: 1.25,
                              bgcolor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: 1.5,
                            }}
                          >
                            <Field
                              label="Blood Pressure"
                              value={c.blood_pressure || (c.vital_signs_sbp ? `${c.vital_signs_sbp}/${c.vital_signs_dbp}` : '—')}
                            />
                            <Field
                              label="Heart Rate"
                              value={c.heart_rate || c.vital_signs_heart_rate ? `${c.heart_rate || c.vital_signs_heart_rate} bpm` : '—'}
                            />
                            <Field
                              label="Respiratory Rate"
                              value={c.respiratory_rate || c.vital_signs_respiratory_rate ? `${c.respiratory_rate || c.vital_signs_respiratory_rate} /min` : '—'}
                            />
                            <Field
                              label="Temperature"
                              value={c.temperature || c.vital_signs_temperature ? `${c.temperature || c.vital_signs_temperature} °C` : '—'}
                            />
                            <Field
                              label="Weight"
                              value={c.weight || c.vital_signs_weight ? `${c.weight || c.vital_signs_weight} kg` : '—'}
                            />
                          </Box>

                          {/* Diagnosis & Findings */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Field
                              label="Doctor Diagnosis"
                              value={
                                c.diagnosis ||
                                (c.exposure_category
                                  ? `Animal Bite Exposure — Category ${c.exposure_category}`
                                  : 'Pending Doctor Notes')
                              }
                            />

                            {c.doctor_notes && (
                              <Field label="Clinical Notes / Findings" value={c.doctor_notes} />
                            )}

                            {c.assessment_summary && (
                              <Field label="Assessment Summary" value={c.assessment_summary} />
                            )}
                          </Box>

                          {/* Reassessment Continuity Banner */}
                          {isReassessment && (
                            <Notice
                              tone="blue"
                              title="Reassessment Visit Linked to Bite Case"
                            >
                              {c.reassessment_decision === 'continue' ? (
                                <span>
                                  Doctor confirmed continuation of the previous prescription orders. The previous assessment form is preserved intact in medical history.
                                </span>
                              ) : c.reassessment_decision === 'modify' ? (
                                <span>
                                  Doctor modified the treatment plan during this reassessment.
                                </span>
                              ) : c.reassessment_decision === 'no_treatment' ? (
                                <span>
                                  Reassessment determined no further injections are required.
                                </span>
                              ) : (
                                <span>
                                  Reassessment conducted for returning patient without creating a duplicate bite case.
                                </span>
                              )}
                            </Notice>
                          )}

                          {/* Prescribed Orders Summary */}
                          <Box sx={{ mt: 0.5, p: 1.25, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 1.5 }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.75 }}>
                              Doctor Treatment Orders (Prescription)
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1 }}>
                              <div>
                                <span style={{ fontSize: 10.5, color: '#166534', fontWeight: 600, display: 'block' }}>Anti-Rabies Vaccine:</span>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#14532d' }}>
                                  {c.prescribed_vaccine_type ? `Prescribed (${c.prescribed_vaccine_type})` : c.exposure_category === 'I' ? 'Not Indicated (Cat I)' : '—'}
                                </span>
                              </div>
                              <div>
                                <span style={{ fontSize: 10.5, color: '#166534', fontWeight: 600, display: 'block' }}>Tetanus Toxoid (TT):</span>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#14532d' }}>
                                  {c.prescribed_tt ? `Prescribed (${c.prescribed_tt})` : 'None'}
                                </span>
                              </div>
                              <div>
                                <span style={{ fontSize: 10.5, color: '#166534', fontWeight: 600, display: 'block' }}>Anti-Tetanus Serum (ATS):</span>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#14532d' }}>
                                  {c.prescribed_ats ? `Prescribed (${c.prescribed_ats})` : 'None'}
                                </span>
                              </div>
                              <div>
                                <span style={{ fontSize: 10.5, color: '#166534', fontWeight: 600, display: 'block' }}>Rabies Immunoglobulin (RIG):</span>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#14532d' }}>
                                  {c.prescribed_rig ? `Prescribed (${c.prescribed_rig})` : c.exposure_category === 'III' ? 'Indicated' : 'Not Indicated'}
                                </span>
                              </div>
                            </Box>
                          </Box>
                        </Box>
                      </Collapse>
                    </Box>

                    {/* ── Sub-card 2: Treatment Card & Administration Status ── */}
                    <Box
                      sx={{
                        bgcolor: 'var(--card-bg-solid, #ffffff)',
                        border: `1px solid ${accent}`,
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        {...clickableProps(() => toggle(`${k}:treatment`))}
                        aria-expanded={isTreatOpen}
                        sx={{
                          px: 1.75,
                          py: 1.1,
                          bgcolor: adminStatus === 'Administered' ? '#ecfdf5' : adminStatus === 'Not Administered' ? '#fef2f2' : '#f8fafc',
                          borderBottom: isTreatOpen ? `1px solid ${accent}` : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          userSelect: 'none',
                          '&:hover': { opacity: 0.95 },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Icon name="vaccinations" size={16} color="#047857" />
                          <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#047857' }}>
                            Treatment Card &amp; Actual Administration Status
                          </Typography>
                          <StatusChip tone={tone} label={statusBadgeText} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span style={{ fontSize: 11.5, color: '#047857', fontWeight: 700 }}>
                            {isTreatOpen ? 'Hide Treatment Card' : 'Show Treatment Card'}
                          </span>
                          <ToggleArrow open={isTreatOpen} />
                        </Box>
                      </Box>

                      <Collapse in={isTreatOpen} unmountOnExit>
                        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {/* Status Alert Banner */}
                          {adminStatus === 'Administered' && (
                            <Notice tone="green" title={`Confirmed Administered by Nurse on ${fmtDay(c.consultation_date)}`}>
                              Injections were administered and verified in Form 3. Stock deductions were recorded.
                            </Notice>
                          )}

                          {adminStatus === 'Not Administered' && (
                            <Notice tone="red" title="Prescribed Treatment Was Not Administered">
                              {notAdminReason || 'Patient left clinic prior to injection. The treatment card preserves this unadministered assessment.'}
                            </Notice>
                          )}

                          {adminStatus === 'Completed Without Injection' && (
                            <Notice tone="gray" title="Case Completed Without Injection">
                              {c.exposure_category === 'I'
                                ? 'Category I Exposure — Anti-rabies vaccine is not medically indicated.'
                                : 'Doctor determined that no injections were needed for this assessment.'}
                            </Notice>
                          )}

                          {/* Administered Injections Table (if administered) */}
                          {administeredItems.length > 0 && (
                            <Box sx={{ mt: 0.5 }}>
                              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.5 }}>
                                Administered Medications in this Assessment Session
                              </Typography>
                              <Box
                                component="table"
                                sx={{
                                  width: '100%',
                                  borderCollapse: 'collapse',
                                  fontSize: 12,
                                  '& th': { textAlign: 'left', p: '6px 10px', bgcolor: '#f1f5f9', color: '#475569', fontWeight: 700, borderBottom: '1px solid #cbd5e1' },
                                  '& td': { p: '7px 10px', borderBottom: '1px solid #f1f5f9', color: '#1e293b' },
                                }}
                              >
                                <thead>
                                  <tr>
                                    <th>Treatment / Vaccine</th>
                                    <th>Product</th>
                                    <th>Dose · Route</th>
                                    <th>Date</th>
                                    <th>Administered By</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {administeredItems.map((it: any, i: number) => (
                                    <tr key={i}>
                                      <td style={{ fontWeight: 700 }}>{it.type || it.product}</td>
                                      <td>{it.product || it.type}</td>
                                      <td>{[it.dosage_ml ? `${it.dosage_ml} mL` : null, it.dose_iu ? `${it.dose_iu} IU` : null, it.route || 'IM'].filter(Boolean).join(' · ')}</td>
                                      <td>{fmtDay(it.date_administered || c.consultation_date)}</td>
                                      <td>{it.administered_by || 'Staff Nurse'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Box>
                            </Box>
                          )}

                          {/* Printable Card Callout & Button */}
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: 1,
                              p: 1.25,
                              bgcolor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: 1.5,
                              mt: 0.5,
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Icon name="reports" size={15} color="#0369a1" />
                              <Typography sx={{ fontSize: 12, color: '#475569' }}>
                                <strong>Official Animal Bite Treatment Form (Assessment #{idx + 1}):</strong> displays diagnosis, exposure category, prescribed treatment, and actual administration status.
                              </Typography>
                            </Box>

                            {onOpenTreatmentCard && (
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<Icon name="print" size={14} color="#ffffff" />}
                                onClick={() => onOpenTreatmentCard(c.treatment_id)}
                                sx={{
                                  textTransform: 'none',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  bgcolor: '#0284c7',
                                  '&:hover': { bgcolor: '#0369a1' },
                                  py: 0.4,
                                  px: 1.5,
                                  fontFamily: 'inherit',
                                }}
                              >
                                Open Printable Form →
                              </Button>
                            )}
                          </Box>
                        </Box>
                      </Collapse>
                    </Box>
                  </Box>
                </Collapse>
              </Box>
            );
          })
        )}

      </Box>

      {/* ── Dose Progress Strip (For Category II/III) ── */}
      {!isCategory1 && expectedDoses.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginRight: 4 }}>
            PEP Progress:
          </span>
          {expectedDoses.map((n) => {
            const appt = appointments.find((a) => Number(a.dose_number) === n);
            const done = givenDoseNumbers.has(n);
            const missed = !done && String(appt?.status || '').toLowerCase() === 'missed';
            return (
              <StatusChip
                key={n}
                tone={done ? 'green' : missed ? 'red' : appt ? 'blue' : 'gray'}
                label={`${doseLabel(n)} · ${done ? 'Given' : missed ? 'Missed' : appt ? fmtDay(toDay(appt.appointment_date)) : 'Pending'}`}
              />
            );
          })}
        </Box>
      )}

      {/* ── Group 1: Initial Exposure Baseline (Clean, Non-repetitive, Collapsible) ── */}
      <Box
        sx={{
          bgcolor: 'var(--card-bg-solid, #ffffff)',
          border: '1px solid var(--border-glow, #e2e8f0)',
          borderLeft: '4px solid #64748b',
          borderRadius: 2.5,
          overflow: 'hidden',
        }}
      >
        <Box
          {...clickableProps(() => toggle('form1', false))}
          aria-expanded={isOpen('form1', false)}
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            cursor: 'pointer',
            userSelect: 'none',
            '&:hover': { bgcolor: 'var(--card-bg, #f8fafc)' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: '#f1f5f9',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid #cbd5e1',
              }}
            >
              <Icon name="reports" size={16} color="#475569" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'var(--text-h, #0f172a)' }}>
                Initial Animal Bite Exposure Baseline
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'var(--text-m, #64748b)' }}>
                Exposure incident details recorded at intake · Exposure Category: {latestCategory ? `Category ${latestCategory}` : '—'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {bite && <StatusChip tone="gray" label={`Bite: ${fmtDay(toDay(bite.bite_date))}`} />}
            {latestCategory && (
              <StatusChip
                tone={latestCategory === 'III' ? 'red' : latestCategory === 'II' ? 'amber' : 'green'}
                label={`Category ${latestCategory}`}
              />
            )}
            <ToggleArrow open={isOpen('form1', false)} />
          </Box>
        </Box>

        <Collapse in={isOpen('form1', false)} unmountOnExit>
          <Box
            sx={{
              borderTop: '1px solid var(--border-glow, #e2e8f0)',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              bgcolor: 'var(--bg-secondary, #f9fafb)',
            }}
          >
            {bite ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 1.5,
                  p: 1.5,
                  bgcolor: 'var(--card-bg-solid, #ffffff)',
                  border: '1px solid var(--border-glow, #e2e8f0)',
                  borderRadius: 2,
                }}
              >
                <Field label="Date of Exposure" value={fmtDay(toDay(bite.bite_date))} />
                <Field label="Place of Exposure" value={bite.bite_place} />
                <Field
                  label="Biting Animal"
                  value={[bite.animal_type, bite.animal_status ? `(${bite.animal_status})` : null].filter(Boolean).join(' ')}
                />
                <Field label="Body Part Affected" value={bite.body_part_exposed} />
                <Field label="Wound Washed with Soap" value={bite.site_washed ? 'Yes (Soap & Water)' : 'No / Unknown'} />
                <Field label="Episode Type" value={isReExposure ? 'Doctor-Ordered Re-Exposure Plan' : 'Primary PEP'} />
              </Box>
            ) : (
              <Typography sx={{ fontSize: 12, color: 'var(--text-m, #64748b)' }}>
                No bite incident record linked to this episode.
              </Typography>
            )}

            {onOpenTab && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  pt: 1,
                  borderTop: '1px dashed var(--border-glow, #cbd5e1)',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Typography sx={{ fontSize: 12, color: 'var(--text-m, #64748b)' }}>
                  Full demographic, PhilHealth, address, and household details are recorded in Form 1.
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onOpenTab('form1')}
                  endIcon={<Icon name="chevronRight" size={14} color="#059669" />}
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'none',
                    color: '#059669',
                    borderColor: '#a7f3d0',
                    bgcolor: '#ecfdf5',
                    '&:hover': { bgcolor: '#d1fae5', borderColor: '#6ee7b7' },
                  }}
                >
                  View Full Form 1 Registration
                </Button>
              </Box>
            )}
          </Box>
        </Collapse>
      </Box>

      {/* ── Group 3: Follow-up Routine PEP Schedule & Upcoming Doses (Collapsible) ── */}
      {!isCategory1 && upcomingAppointments.length > 0 && (
        <Box
          sx={{
            bgcolor: 'var(--card-bg-solid, #ffffff)',
            border: '1px solid var(--border-glow, #e2e8f0)',
            borderLeft: '4px solid #3b82f6',
            borderRadius: 2.5,
            overflow: 'hidden',
          }}
        >
          <Box
            {...clickableProps(() => toggle('followups'))}
            aria-expanded={isOpen('followups')}
            sx={{
              px: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              cursor: 'pointer',
              userSelect: 'none',
              '&:hover': { bgcolor: 'var(--card-bg, #f8fafc)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: '#3b82f6',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="calendar" size={16} color="#ffffff" />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'var(--text-h, #0f172a)' }}>
                  Follow-up Routine Vaccination Schedule ({upcomingAppointments.length} Remaining)
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'var(--text-m, #64748b)' }}>
                  Upcoming post-exposure prophylaxis injection dates under approved doctor plan.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StatusChip tone="blue" label={`${upcomingAppointments.length} Scheduled`} />
              <ToggleArrow open={isOpen('followups')} />
            </Box>
          </Box>

          <Collapse in={isOpen('followups')} unmountOnExit>
            <Box
              sx={{
                borderTop: '1px solid var(--border-glow, #e2e8f0)',
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                bgcolor: 'var(--bg-secondary, #f9fafb)',
              }}
            >
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.25 }}>
                {upcomingAppointments.map((a: any, i: number) => {
                  const day = toDay(a.appointment_date);
                  const dose = a.dose_number !== null ? doseLabel(a.dose_number) : 'Follow-up';
                  return (
                    <Box
                      key={a.appointment_id || i}
                      sx={{
                        p: 1.5,
                        bgcolor: 'var(--card-bg-solid, #ffffff)',
                        border: '1px solid #bfdbfe',
                        borderRadius: 1.5,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1d4ed8' }}>
                          {dose}
                        </Typography>
                        <StatusChip tone="blue" label={a.status || 'Scheduled'} />
                      </Box>
                      <Typography sx={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
                        {fmtDay(day)}
                      </Typography>
                      {a.notes && (
                        <Typography sx={{ fontSize: 11, color: '#64748b' }}>
                          {a.notes}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Collapse>
        </Box>
      )}
      {selectedReferralSlip && (
        <DohTransferSlipModal
          open={Boolean(selectedReferralSlip)}
          onClose={() => setSelectedReferralSlip(null)}
          patient={p}
          incident={bite || {
            case_number: selectedReferralSlip.registry_no || p.case_number,
            exposure_category: selectedReferralSlip.exposure_category || latestCategory,
            diagnosis: selectedReferralSlip.diagnosis,
            transferred_to_facility: selectedReferralSlip.referred_to,
            transfer_reason: selectedReferralSlip.reason_for_referral,
          }}
          treatmentRecords={cData.administered_doses || []}
          transferredToFacility={selectedReferralSlip.referred_to}
          transferReason={selectedReferralSlip.reason_for_referral}
          transferDate={selectedReferralSlip.consultation_date}
          diagnosis={selectedReferralSlip.diagnosis}
        />
      )}
    </Box>
  );
}

export default PatientHistoryInlineView;
