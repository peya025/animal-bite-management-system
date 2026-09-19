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
  TextField,
} from '@mui/material';
import { LockOutlined as LockIcon } from '@mui/icons-material';
import { Icon } from '../../../shared/components/ui/Icon';
import GeneralTreatmentForm from '../../consultations/components/GeneralTreatmentForm';
import VaccinationRecordForm from '../../vaccinations/components/VaccinationRecordForm';
import PatientEditModal from './PatientEditModal';
import api from '../../../shared/services/api';
import type { Patient } from '../types';
import { getMembershipByType, getPatientMemberships } from '../utils/memberships';

interface PatientDetailsModalProps {
  open: boolean;
  patient: Patient | null;
  onClose: () => void;
  onEdit?: (patient: Patient) => void;
  onPatientUpdated?: (patient: any) => void;
  readOnly?: boolean;
}

// ── Read-only Banner ─────────────────────────────────────────────────────────

function ReadOnlyBanner() {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5,
      px: 2.5, py: 1.5, mb: 3,
      bgcolor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 2,
    }}>
      <LockIcon sx={{ fontSize: 16, color: '#f59e0b', flexShrink: 0 }} />
      <Typography sx={{ fontSize: 13, color: 'var(--text-b, #92400e)' }}>
        You are viewing this form in <strong>read-only mode</strong>.
      </Typography>
    </Box>
  );
}

// ── Tab Bar ──────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'form1', label: 'Form 1', roleLabel: 'Registration', owner: 'registration' as const },
  { key: 'form2', label: 'Form 2', roleLabel: 'Doctor',       owner: 'triage'        as const },
  { key: 'form3', label: 'Form 3', roleLabel: 'Nurse',        owner: 'treatment'     as const },
];

function TabBar({ active, onSelect }: { active: string; onSelect: (key: string) => void }) {
  return (
    <Box sx={{ display: 'flex', borderBottom: '1px solid var(--border-glow, #f3f4f6)', px: 0, bgcolor: 'var(--card-bg-solid, #ffffff)' }}>
      {TABS.map(tab => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 18px',
              background: 'none',
              border: 'none',
              borderBottom: isActive ? '2px solid #10b981' : '2px solid transparent',
              marginBottom: -1,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            <span style={{
              fontSize: 13.5,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#10b981' : 'var(--text-m, #6b7280)',
            }}>
              {tab.label}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 999,
              backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.1)',
              color: isActive ? '#10b981' : 'var(--text-m, #9ca3af)',
              border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-glow, #e5e7eb)'}`,
            }}>
              {tab.roleLabel}
            </span>
          </button>
        );
      })}
    </Box>
  );
}

// ── Form 1 helpers ───────────────────────────────────────────────────────────

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

// ── Form 1 Section & Field ───────────────────────────────────────────────────

function Form1Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ borderBottom: '1px solid var(--border-glow, #f3f4f6)', p: 3, '&:last-of-type': { borderBottom: 'none' } }}>
      <Typography sx={{
        fontSize: 13, fontWeight: 700, color: '#10b981',
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
        fontSize: 11, fontWeight: 600, color: 'var(--text-m, #9ca3af)',
        textTransform: 'uppercase', letterSpacing: '0.45px', mb: 0.5,
      }}>
        {label}
      </Typography>
      <Typography sx={{
        fontSize: 14, color: 'var(--text-h, #111827)', fontWeight: 500,
        wordBreak: 'break-word',
      }}>
        {value}
      </Typography>
    </Box>
  );
}

// ── Form 1 Inline View ────────────────────────────────────────────────────────

function Form1InlineView({ patient: p, onEdit }: { patient: any; onEdit?: () => void }) {
  const patient = toRecord(p);
  const details = toRecord(firstNonEmpty(patient.details));
  const memberships = getPatientMemberships(p);
  const philhealth = getMembershipByType(memberships, 'philhealth');
  const fourps = getMembershipByType(memberships, 'fourps');
  const dswd = getMembershipByType(memberships, 'dswd_nhts');
  const senior = getMembershipByType(memberships, 'senior_citizen');
  const pwd = getMembershipByType(memberships, 'pwd');
  const indigenous = getMembershipByType(memberships, 'indigenous_member');
  const other = getMembershipByType(memberships, 'other');
  const civilStatusRaw = firstNonEmpty((details as any).civil_status, (patient as any).civil_status);
  const spouseRaw = firstNonEmpty((details as any).spouse_name, (patient as any).spouse_name);

  return (
    <Box sx={{ bgcolor: 'var(--card-bg-solid, #ffffff)', borderRadius: 3, border: '1px solid var(--border-glow, #e5e7eb)', overflow: 'hidden' }}>
      {/* Card header */}
      <Box sx={{ px: 3, py: 2, bgcolor: 'var(--card-bg, #f9fafb)', borderBottom: '1px solid var(--border-glow, #e5e7eb)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h, #374151)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Patient Registration — Form 1
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'var(--text-m, #9ca3af)', mt: 0.25 }}>
            Patient Enrolment & Demographic Record
          </Typography>
        </Box>
        {onEdit && (
          <Button
            size="small"
            variant="outlined"
            onClick={onEdit}
            startIcon={<span style={{ fontSize: 13 }}>✏️</span>}
            sx={{
              borderColor: '#10b981',
              color: '#059669',
              fontWeight: 600,
              fontSize: 12,
              textTransform: 'none',
              borderRadius: 1.5,
              '&:hover': { bgcolor: '#f0fdf4', borderColor: '#047857' },
            }}
          >
            Update Demographics
          </Button>
        )}
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
          <Form1Field label="Any Membership?"         value={asYesNo(memberships.length > 0 ? 'yes' : firstNonEmpty((details as any).has_membership))} />
          <Form1Field label="PhilHealth Member?"      value={asYesNo(philhealth ? 'yes' : firstNonEmpty((details as any).philhealth_member))} />
          <Form1Field label="Status Type"             value={asOption(firstNonEmpty(philhealth?.status_value, (details as any).philhealth_status), PHILHEALTH_STATUS_LABELS)} />
          <Form1Field label="PhilHealth No."          value={asDisplayValue(firstNonEmpty(philhealth?.membership_id_no, (details as any).philhealth_no))} />
          <Form1Field label="Category"                value={asOption(firstNonEmpty(philhealth?.category, (details as any).philhealth_category), PHILHEALTH_CATEGORY_LABELS)} />
          <Form1Field label="4Ps Member?"             value={asYesNo(fourps ? 'yes' : firstNonEmpty((details as any).fourps_member))} />
          <Form1Field label="4Ps Category"            value={asDisplayValue(firstNonEmpty(fourps?.category, (details as any).fourps_category))} />
          <Form1Field label="4Ps Relationship"        value={asDisplayValue(firstNonEmpty(fourps?.relationship_value, (details as any).fourps_relationship))} />
          <Form1Field label="Registered 4Ps Beneficiary" value={asDisplayValue(firstNonEmpty(fourps?.registered_beneficiary, (details as any).registered_fourps_beneficiary))} />
          <Form1Field label="DSWD NHTS?"              value={asYesNo(dswd ? 'yes' : firstNonEmpty((details as any).dswd_nhts))} />
          <Form1Field label="Senior Citizen ID"       value={asDisplayValue(firstNonEmpty(senior?.membership_id_no))} />
          <Form1Field label="PWD ID"                  value={asDisplayValue(firstNonEmpty(pwd?.membership_id_no))} />
          <Form1Field label="Indigenous Tribe"        value={asDisplayValue(firstNonEmpty(indigenous?.extra_value))} />
          <Form1Field label="Other Membership"        value={asDisplayValue(firstNonEmpty(other?.membership_label))} />
          <Form1Field label="Other Membership ID"     value={asDisplayValue(firstNonEmpty(other?.membership_id_no))} />
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
  onPatientUpdated,
  readOnly = false,
}: PatientDetailsModalProps) {
  const [printing, setPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState('form1');
  const [fullPatient, setFullPatient] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [historySummary, setHistorySummary] = useState<any>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newExposureOpen, setNewExposureOpen] = useState(false);
  const [newExposure, setNewExposure] = useState({
    bite_date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (!open || !patient) {
      setFullPatient(null);
      setEpisodes([]);
      setHistorySummary(null);
      setSelectedEpisodeId(null);
      setActiveTab('form1');
      setCheckInSuccess(null);
      return;
    }
    const patientId = (patient as any).patient_id || (patient as any).id;
    setLoadingDetails(true);
    Promise.all([
      api.get(`/patients/${patientId}`).catch(() => null),
      api.get(`/cases/patient/${patientId}/episodes`).catch(() => null),
    ]).then(([pRes, epRes]) => {
      if (pRes?.data) setFullPatient(pRes.data);
      else setFullPatient(patient);

      if (epRes?.data) {
        setEpisodes(epRes.data.episodes || []);
        setHistorySummary(epRes.data.summary || null);
        if (epRes.data.episodes?.length > 0) {
          setSelectedEpisodeId(epRes.data.episodes[0].bite_id);
        }
      }
    }).finally(() => setLoadingDetails(false));
  }, [open, patient]);

  if (!patient) return null;

  const p = (fullPatient || patient) as any;
  const currentEp = episodes.find((e) => e.bite_id === selectedEpisodeId) || episodes[0] || null;

  const handleRegisterNewExposure = async () => {
    const patientId = p.patient_id || p.id;
    // Validate: exposure date cannot be in the future
    if (newExposure.bite_date && newExposure.bite_date > new Date().toISOString().split('T')[0]) {
      alert('Exposure date cannot be a future date.');
      return;
    }
    setCheckingIn(true);
    try {
      const res = await api.post('/cases/new-exposure', {
        patient_id: patientId,
        bite_date: newExposure.bite_date,
      });
      setNewExposureOpen(false);
      setCheckInSuccess(`New exposure registered. Sent to Doctor assessment (Queue #${res.data?.queue?.queue_number || '1'}).`);
      setTimeout(() => {
        setCheckInSuccess(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to check in to triage');
    } finally {
      setCheckingIn(false);
    }
  };

  const fakeEntry = {
    patient: p,
    patient_id: p.patient_id || p.id,
    bite_id: currentEp?.bite_id || null,
    incident: currentEp,
    episode_type: currentEp?.episode_type || 'primary',
    status: 'completed',
  };

  const handleDirectPrint = async () => {
    if (!patient || printing) return;
    setPrinting(true);
    try {
      const token = localStorage.getItem('authToken') || '';
      const patientId = (patient as any).patient_id || (patient as any).id;
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      const printUrl = `${API_BASE}/print/patient/${patientId}/enrolment`;

      const response = await fetch(printUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/html',
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to fetch print template (HTTP ${response.status})`);
      }
      const html = await response.text();

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      iframe.srcdoc = html;
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error('Print trigger failed:', e);
          } finally {
            setTimeout(() => {
              if (document.body.contains(iframe)) document.body.removeChild(iframe);
            }, 2000);
            setPrinting(false);
          }
        }, 500);
      };
    } catch (err) {
      console.error('Print failed:', err);
      setPrinting(false);
    }
  };

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
            <Form1InlineView patient={p} onEdit={readOnly ? undefined : () => setShowEditModal(true)} />
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
      slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden', bgcolor: 'var(--card-bg-solid, #ffffff)', border: '1px solid var(--border-glow, transparent)' } } }}
    >
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        pb: 1.5, borderBottom: '1px solid var(--border-glow, #f3f4f6)', bgcolor: 'var(--card-bg-solid, #ffffff)', px: 3, pt: 2.5,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '50%', bgcolor: 'rgba(16, 185, 129, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#10b981' }}>
              {[p.first_name, p.last_name].filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, color: 'var(--text-h, #111827)', fontSize: 16, fontFamily: 'inherit' }}>
              {p.last_name}, {p.first_name} {p.middle_name ? p.middle_name[0] + '.' : ''}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
              <Typography sx={{ fontSize: 12, color: 'var(--text-m, #6b7280)', fontFamily: 'inherit' }}>
                {p.age}y · {p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : ''}
              </Typography>
              <Chip
                label={`#${p.patient_number || p.patient_id}`}
                size="small"
                sx={{ bgcolor: 'var(--input-bg, #f3f4f6)', color: 'var(--text-b, #374151)', fontWeight: 700, fontFamily: 'monospace', height: 18, fontSize: 11, border: '1px solid var(--border-glow, transparent)' }}
              />
            </Box>
          </Box>
        </Box>
        <Icon name="patients" size={20} color="var(--text-m, #d1d5db)" />
      </DialogTitle>

      <TabBar active={activeTab} onSelect={setActiveTab} />

      {episodes.length > 1 && (
        <Box sx={{ px: 3, py: 1.25, bgcolor: 'var(--card-bg, #f8fafc)', borderBottom: '1px solid var(--border-glow, #e2e8f0)', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-m, #475569)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Episodes / Incidents:
          </Typography>
          {episodes.map((ep) => {
            const isSelected = (selectedEpisodeId || episodes[0]?.bite_id) === ep.bite_id;
            return (
              <Chip
                key={ep.bite_id}
                label={`Episode #${ep.episode_number} (${ep.episode_type === 'pending_assessment' ? 'Awaiting Doctor Assessment' : ep.episode_type === 're_exposure' ? 'Doctor-Ordered Re-Exposure Plan' : 'Primary PEP'} • ${ep.status})`}
                onClick={() => setSelectedEpisodeId(ep.bite_id)}
                color={isSelected ? 'success' : 'default'}
                variant={isSelected ? 'filled' : 'outlined'}
                size="small"
                sx={{ fontWeight: isSelected ? 700 : 500, fontSize: 11.5, cursor: 'pointer' }}
              />
            );
          })}
        </Box>
      )}

      {historySummary?.has_history && episodes.length > 1 && (
        <Box sx={{ px: 3, py: 1, bgcolor: 'rgba(16, 185, 129, 0.1)', borderBottom: '1px solid var(--border-glow, #a7f3d0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 12, color: 'var(--text-h, #065f46)', fontWeight: 600 }}>
            🛡️ <strong>Immunization History Verified</strong>: Patient has documented rabies vaccination ({historySummary.confidence_label}).
          </Typography>
          <Chip
            label={historySummary.can_receive_booster ? 'Booster Eligible (RIG Withheld)' : 'Primary PEP Required'}
            size="small"
            sx={{ bgcolor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 700, fontSize: 10.5, height: 20 }}
          />
        </Box>
      )}

      {checkInSuccess && (
        <Box sx={{ px: 3, py: 1.5, bgcolor: 'rgba(16, 185, 129, 0.1)', borderBottom: '1px solid var(--border-glow, #bbf7d0)', color: '#10b981', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          ✓ {checkInSuccess}
        </Box>
      )}

      <DialogContent sx={{ p: 0, fontFamily: 'inherit', minHeight: 380, bgcolor: 'var(--bg-secondary, #f9fafb)' }}>
        {renderTabContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid var(--border-glow, #e5e7eb)', bgcolor: 'var(--card-bg-solid, #ffffff)', justifyContent: 'space-between', gap: 1 }}>
        {(() => {
          const canRegisterNewExposure = !readOnly;

          if (!canRegisterNewExposure) {
            return <div />;
          }

          return (
            <Button
              variant="contained"
              onClick={() => setNewExposureOpen(true)}
              disabled={checkingIn}
              sx={{
                bgcolor: '#0284c7',
                '&:hover': { bgcolor: '#0369a1' },
                color: '#fff',
                fontWeight: 700,
                fontSize: 12.5,
                textTransform: 'none',
                fontFamily: 'inherit',
              }}
            >
              + Register New Exposure
            </Button>
          );
        })()}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {activeTab === 'form1' && (
            <Button
              variant="outlined"
              onClick={handleDirectPrint}
              disabled={printing}
              startIcon={printing ? <CircularProgress size={14} sx={{ color: '#059669' }} /> : <Icon name="print" size={15} color="#059669" />}
              sx={{
                borderColor: '#10b981', color: '#10b981', fontWeight: 600, fontSize: 13,
                textTransform: 'none', fontFamily: 'inherit',
                '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.1)', borderColor: '#059669' },
              }}
            >
              {printing ? 'Opening Printer…' : 'Print Form 1 (Enrolment)'}
            </Button>
          )}
          <Button
            onClick={onClose}
            sx={{ color: 'var(--text-m, #6b7280)', textTransform: 'none', fontWeight: 600, fontFamily: 'inherit' }}
          >
            Close
          </Button>
        </Box>
      </DialogActions>

      {/* ── Role-based Demographic Edit Modal ── */}
      <PatientEditModal
        open={showEditModal}
        patient={p}
        onClose={() => setShowEditModal(false)}
        onSave={(updatedPatient) => {
          setFullPatient((prev: any) => ({
            ...(prev || {}),
            ...(updatedPatient || {}),
            details: {
              ...((prev && prev.details) || {}),
              ...((updatedPatient && updatedPatient.details) || {}),
            },
          }));
          if (onPatientUpdated) onPatientUpdated(updatedPatient);
          if (onEdit) onEdit(updatedPatient);
        }}
      />

      <Dialog
        open={newExposureOpen}
        onClose={() => !checkingIn && setNewExposureOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Check In New Exposure for Doctor</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: 13, color: '#475569', mb: 2 }}>
            Record the exposure date, then send the patient to the Doctor. The Doctor completes the assessment and determines any treatment; Registration does not need to fill out another clinical form.
          </Typography>
          <Box sx={{ maxWidth: 320 }}>
            <TextField label="Exposure date" type="date" required size="small" value={newExposure.bite_date}
              onChange={(event) => setNewExposure({ ...newExposure, bite_date: event.target.value })}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { max: new Date().toISOString().split('T')[0] },
              }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewExposureOpen(false)} disabled={checkingIn}>Cancel</Button>
          <Button variant="contained" onClick={handleRegisterNewExposure} disabled={checkingIn}
            sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' } }}>
            {checkingIn ? 'Checking in…' : 'Check In to Doctor'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
