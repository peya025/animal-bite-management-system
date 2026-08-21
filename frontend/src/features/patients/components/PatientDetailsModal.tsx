import { useState, useEffect, type ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  CircularProgress,
} from '@mui/material';
import { LockOutlined as LockIcon } from '@mui/icons-material';
import { Icon } from '../../../shared/components/ui/Icon';
import GeneralTreatmentForm from '../../consultations/components/GeneralTreatmentForm';
import VaccinationRecordForm from '../../vaccinations/components/VaccinationRecordForm';
import api from '../../../shared/services/api';
import type { Patient } from '../types';

interface PatientDetailsModalProps {
  open: boolean;
  patient: Patient | null;
  onClose: () => void;
  onEdit: (patient: Patient) => void;
}

// ── Read-only Banner (same as QueuePatientDetailPage) ────────────────────────

function ReadOnlyBanner() {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5,
      px: 2.5, py: 1.5, mb: 3,
      bgcolor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 2,
    }}>
      <LockIcon sx={{ fontSize: 16, color: '#d97706', flexShrink: 0 }} />
      <Typography sx={{ fontSize: 13, color: '#92400e' }}>
        You are viewing this form in <strong>read-only mode</strong>.
      </Typography>
    </Box>
  );
}

// ── Tab Bar (same style as QueuePatientDetailPage) ───────────────────────────

const TABS = [
  { key: 'form1', label: 'Form 1', roleLabel: 'Registration', owner: 'registration' as const },
  { key: 'form2', label: 'Form 2', roleLabel: 'Doctor',       owner: 'triage'        as const },
  { key: 'form3', label: 'Form 3', roleLabel: 'Nurse',        owner: 'treatment'     as const },
];

function TabBar({ active, onSelect }: { active: string; onSelect: (key: string) => void }) {
  return (
    <Box sx={{ display: 'flex', borderBottom: '2px solid #f3f4f6', px: 0, bgcolor: '#fff' }}>
      {TABS.map(tab => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 18px',
              background: 'none', border: 'none',
              borderBottom: isActive ? '2px solid #10b981' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            <span style={{
              fontSize: 13.5, fontWeight: isActive ? 700 : 500,
              color: isActive ? '#10b981' : '#6b7280',
            }}>
              {tab.label}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600,
              padding: '2px 8px', borderRadius: 999,
              backgroundColor: isActive ? '#d1fae5' : '#f0fdf4',
              color: isActive ? '#065f46' : '#9ca3af',
              border: `1px solid ${isActive ? '#a7f3d0' : '#e5e7eb'}`,
            }}>
              {tab.roleLabel}
            </span>
          </button>
        );
      })}
    </Box>
  );
}

// ── Form 1 helpers (same as QueuePatientDetailPage) ──────────────────────────

const CIVIL_STATUS_LABELS: Record<string, string> = {
  single: 'Single', married: 'Married', widowed: 'Widowed',
  separated: 'Separated', annulled: 'Annulled', cohabitation: 'Co-Habitation',
};
const EDUCATIONAL_ATTAINMENT_LABELS: Record<string, string> = {
  no_formal: 'No Formal Education', elementary: 'Elementary', high_school: 'High School',
  vocational: 'Vocational', college: 'College', post_graduate: 'Post Graduate',
};
const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  employed: 'Employed', unemployed: 'None/Unemployed', self_employed: 'Self-Employed',
  retired: 'Retired', student: 'Student',
};
const FAMILY_MEMBER_LABELS: Record<string, string> = {
  father: 'Father (Ama)', mother: 'Mother (Ina)', son: 'Son (Anak na Lalaki)',
  daughter: 'Daughter (Anak na Babae)', others: 'Others',
};
const PHILHEALTH_STATUS_LABELS: Record<string, string> = { member: 'Member', dependent: 'Dependent' };
const PHILHEALTH_CATEGORY_LABELS: Record<string, string> = {
  fe_private: 'FE – Private', fe_government: 'FE – Government', ie: 'IE', others: 'Others',
};

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}
function firstNonEmpty(...values: unknown[]): unknown {
  for (const v of values) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    return v;
  }
  return undefined;
}
function asDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value.trim() || '—';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
function asDate(value: unknown): string {
  if (!value) return '—';
  const text = String(value).trim();
  if (!text) return '—';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return asDisplayValue(value);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
function asOption(value: unknown, labels: Record<string, string>): string {
  const raw = asDisplayValue(value);
  if (raw === '—') return raw;
  return labels[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function asYesNo(value: unknown): string {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return '—';
  if (raw === 'yes') return 'Yes';
  if (raw === 'no') return 'No';
  return asDisplayValue(value);
}

// ── Form 1 Section & Field (same style as QueuePatientDetailPage) ─────────────

function Form1Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ borderBottom: '1px solid #f3f4f6', p: 3, '&:last-of-type': { borderBottom: 'none' } }}>
      <Typography sx={{
        fontSize: 13, fontWeight: 700, color: '#059669',
        textTransform: 'uppercase', letterSpacing: '0.5px', mb: 2,
      }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function Form1Field({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography sx={{
        fontSize: 11, fontWeight: 600, color: '#9ca3af',
        textTransform: 'uppercase', letterSpacing: '0.45px', mb: 0.5,
      }}>
        {label}
      </Typography>
      <Typography sx={{
        fontSize: 14, color: '#111827', fontWeight: 500,
        wordBreak: 'break-word',
      }}>
        {value}
      </Typography>
    </Box>
  );
}

// ── Form 1 Inline View (matches QueuePatientDetailPage exactly) ───────────────

function Form1InlineView({ patient: p }: { patient: any }) {
  const patient = toRecord(p);
  const details = toRecord(firstNonEmpty(patient.details));
  const civilStatusRaw = firstNonEmpty((details as any).civil_status, (patient as any).civil_status);
  const spouseRaw = firstNonEmpty((details as any).spouse_name, (patient as any).spouse_name);

  return (
    <Box sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      {/* Card header */}
      <Box sx={{ px: 3, py: 2, bgcolor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Patient Registration — Form 1
        </Typography>
        <Typography sx={{ fontSize: 12, color: '#9ca3af', mt: 0.25 }}>
          Read-only view of Form 1 — Patient Enrolment data
        </Typography>
      </Box>

      <Form1Section title="I. Patient Information (Impormasyon ng Pasyente)">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 2.5, mb: 2.5 }}>
          <Form1Field label="Last Name (Apelyido)"    value={asDisplayValue(firstNonEmpty(patient.last_name))} />
          <Form1Field label="First Name (Pangalan)"   value={asDisplayValue(firstNonEmpty(patient.first_name))} />
          <Form1Field label="Middle Name (Gitnang)"   value={asDisplayValue(firstNonEmpty(patient.middle_name))} />
          <Form1Field label="Suffix"                  value={asDisplayValue(firstNonEmpty(patient.suffix))} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 2.5, mb: 2.5 }}>
          <Form1Field label="Age (Edad)"              value={asDisplayValue(firstNonEmpty(patient.age))} />
          <Form1Field label="Sex (Kasarian)"          value={asOption(firstNonEmpty(patient.sex, patient.gender), { male: 'Male', female: 'Female' })} />
          <Form1Field label="Date of Birth"           value={asDate(firstNonEmpty(patient.date_of_birth))} />
          <Form1Field label="Blood Type"              value={asDisplayValue(firstNonEmpty((details as any).blood_type, patient.blood_type))} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)' }, gap: 2.5 }}>
          <Form1Field label="Mother's Maiden Name"    value={asDisplayValue(firstNonEmpty((details as any).mother_maiden_name))} />
          <Form1Field label="Civil Status"            value={asOption(civilStatusRaw, CIVIL_STATUS_LABELS)} />
          {(String(civilStatusRaw ?? '').toLowerCase() === 'married' || asDisplayValue(spouseRaw) !== '—') && (
            <Form1Field label="Spouse's Name"         value={asDisplayValue(spouseRaw)} />
          )}
        </Box>
      </Form1Section>

      <Form1Section title="Residential Address — Misamis Oriental (Tirahan)">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' }, gap: 2.5 }}>
          <Form1Field label="City / Municipality"     value={asDisplayValue(firstNonEmpty((details as any).address_municipality))} />
          <Form1Field label="Barangay"                value={asDisplayValue(firstNonEmpty((details as any).address_barangay))} />
          <Form1Field label="Purok / Zone / Street"   value={asDisplayValue(firstNonEmpty((details as any).address_purok))} />
          <Form1Field label="Residential Address (Tirahan)" value={asDisplayValue(firstNonEmpty(patient.address))} />
        </Box>
      </Form1Section>

      <Form1Section title="Contact Information">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)' }, gap: 2.5 }}>
          <Form1Field label="Contact Number (Mobile)" value={asDisplayValue(firstNonEmpty(patient.contact_number))} />
          <Form1Field label="Email Address"           value={asDisplayValue(firstNonEmpty(patient.email))} />
          <Form1Field label="Emergency Contact Name"  value={asDisplayValue(firstNonEmpty(patient.emergency_contact_name))} />
          <Form1Field label="Emergency Contact Phone" value={asDisplayValue(firstNonEmpty(patient.emergency_contact_number, patient.emergency_contact_phone))} />
        </Box>
      </Form1Section>

      <Form1Section title="Socioeconomic Information">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' }, gap: 2.5 }}>
          <Form1Field label="Educational Attainment"  value={asOption(firstNonEmpty((details as any).educational_attainment), EDUCATIONAL_ATTAINMENT_LABELS)} />
          <Form1Field label="Employment Status"       value={asOption(firstNonEmpty((details as any).employment_status), EMPLOYMENT_STATUS_LABELS)} />
          <Form1Field label="Family Member Position"  value={asOption(firstNonEmpty((details as any).family_member), FAMILY_MEMBER_LABELS)} />
        </Box>
      </Form1Section>

      <Form1Section title="II. Government Program Information">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)' }, gap: 2.5 }}>
          <Form1Field label="PhilHealth Member?"      value={asYesNo(firstNonEmpty((details as any).philhealth_member))} />
          <Form1Field label="Status Type"             value={asOption(firstNonEmpty((details as any).philhealth_status), PHILHEALTH_STATUS_LABELS)} />
          <Form1Field label="PhilHealth No."          value={asDisplayValue(firstNonEmpty((details as any).philhealth_no))} />
          <Form1Field label="Category"                value={asOption(firstNonEmpty((details as any).philhealth_category), PHILHEALTH_CATEGORY_LABELS)} />
          <Form1Field label="4Ps Member?"             value={asYesNo(firstNonEmpty((details as any).fourps_member))} />
          <Form1Field label="DSWD NHTS?"              value={asYesNo(firstNonEmpty((details as any).dswd_nhts))} />
        </Box>
      </Form1Section>
    </Box>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PatientDetailsModal({
  open,
  patient,
  onClose,
  onEdit,
}: PatientDetailsModalProps) {
  const [printing, setPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState('form1');
  const [fullPatient, setFullPatient] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch full patient data when the modal opens
  useEffect(() => {
    if (!open || !patient) {
      setFullPatient(null);
      setActiveTab('form1');
      return;
    }
    const patientId = (patient as any).patient_id || (patient as any).id;
    setLoadingDetails(true);
    api.get(`/patients/${patientId}`)
      .then(res => setFullPatient(res.data))
      .catch(() => setFullPatient(patient))
      .finally(() => setLoadingDetails(false));
  }, [open, patient]);

  if (!patient) return null;

  const p = (fullPatient || patient) as any;

  // Build a fake "queue entry" shape that GeneralTreatmentForm / VaccinationRecordForm expect
  const fakeEntry = {
    patient: p,
    patient_id: p.patient_id || p.id,
    bite_id: null,
    status: 'completed',
  };

  // ── Print Form 1 ──────────────────────────────────────────────────────────
  const handleDirectPrint = async () => {
    if (!patient || printing) return;
    setPrinting(true);
    try {
      const token = localStorage.getItem('authToken') || '';
      const patientId = (patient as any).patient_id || (patient as any).id;
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      const res = await fetch(`${API_BASE}/print/patient/${patientId}/enrolment?token=${token}`, {
        headers: { Accept: 'text/html', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const iframe = document.createElement('iframe');
      Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: 'none', opacity: '0', pointerEvents: 'none' });
      document.body.appendChild(iframe);
      iframe.srcdoc = html;
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
            setPrinting(false);
          }, 1000);
        }, 350);
      };
    } catch (err) {
      console.error('Print error:', err);
      setPrinting(false);
    }
  };

  // ── Render Tab Content ────────────────────────────────────────────────────
  const renderTabContent = () => {
    if (loadingDetails) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
          <CircularProgress size={22} sx={{ color: '#10b981' }} />
          <Typography sx={{ color: '#6b7280', fontSize: 13 }}>Loading patient records…</Typography>
        </Box>
      );
    }

    switch (activeTab) {
      case 'form1':
        return (
          <Box sx={{ p: 3 }}>
            <ReadOnlyBanner />
            <Form1InlineView patient={p} />
          </Box>
        );
      case 'form2':
        return (
          <Box sx={{ p: 3 }}>
            <ReadOnlyBanner />
            <GeneralTreatmentForm
              open={true}
              entry={fakeEntry as any}
              onClose={() => {}}
              onSave={() => {}}
              readOnly={true}
              inline={true}
            />
          </Box>
        );
      case 'form3':
        return (
          <Box sx={{ p: 3 }}>
            <ReadOnlyBanner />
            <VaccinationRecordForm
              open={true}
              entry={fakeEntry as any}
              onClose={() => {}}
              onSave={() => {}}
              readOnly={true}
              inline={true}
            />
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      {/* ── Title ── */}
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        pb: 1.5, borderBottom: '1px solid #f3f4f6', bgcolor: '#fff', px: 3, pt: 2.5,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Patient avatar */}
          <Box sx={{
            width: 40, height: 40, borderRadius: '50%', bgcolor: '#d1fae5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#065f46' }}>
              {[p.first_name, p.last_name].filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, color: '#111827', fontSize: 16, fontFamily: 'inherit' }}>
              {p.last_name}, {p.first_name} {p.middle_name ? p.middle_name[0] + '.' : ''}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
              <Typography sx={{ fontSize: 12, color: '#6b7280', fontFamily: 'inherit' }}>
                {p.age}y · {p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : ''}
              </Typography>
              <Chip
                label={`#${p.patient_number || p.patient_id}`}
                size="small"
                sx={{ bgcolor: '#f3f4f6', color: '#374151', fontWeight: 700, fontFamily: 'monospace', height: 18, fontSize: 11 }}
              />
            </Box>
          </Box>
        </Box>
        <Icon name="patients" size={20} color="#d1d5db" />
      </DialogTitle>

      {/* ── Tab Bar ── */}
      <TabBar active={activeTab} onSelect={setActiveTab} />

      {/* ── Content ── */}
      <DialogContent sx={{ p: 0, fontFamily: 'inherit', minHeight: 380, bgcolor: '#f9fafb' }}>
        {renderTabContent()}
      </DialogContent>

      {/* ── Footer ── */}
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e5e7eb', bgcolor: '#fff', justifyContent: 'flex-end', gap: 1 }}>
        {activeTab === 'form1' && (
          <Button
            variant="outlined"
            onClick={handleDirectPrint}
            disabled={printing}
            startIcon={printing ? <CircularProgress size={14} sx={{ color: '#059669' }} /> : <Icon name="print" size={15} color="#059669" />}
            sx={{
              borderColor: '#059669', color: '#059669', fontWeight: 600, fontSize: 13,
              textTransform: 'none', fontFamily: 'inherit',
              '&:hover': { bgcolor: '#f0fdf4', borderColor: '#047857' },
            }}
          >
            {printing ? 'Opening Printer…' : 'Print Form 1 (Enrolment)'}
          </Button>
        )}
        <Button
          onClick={onClose}
          sx={{ color: '#6b7280', textTransform: 'none', fontWeight: 600, fontFamily: 'inherit' }}
        >
          Close
        </Button>
        <Button
          variant="contained"
          onClick={() => { onClose(); onEdit(patient); }}
          sx={{ bgcolor: '#10b981', fontWeight: 600, textTransform: 'none', fontFamily: 'inherit', '&:hover': { bgcolor: '#059669' } }}
        >
          Edit Profile
        </Button>
      </DialogActions>
    </Dialog>
  );
}
