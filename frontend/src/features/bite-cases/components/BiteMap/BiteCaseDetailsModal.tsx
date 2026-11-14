import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import api from '../../../../shared/services/api';
import OnlineReferralPhoto from '../../../patients/components/OnlineReferralPhoto';
import PatientHistoryInlineView from '../../../patients/components/PatientHistoryInlineView';
import { getMembershipByType, getPatientMemberships } from '../../../patients/utils/memberships';

// ── Types ────────────────────────────────────────────────────────────────────

type SavedRecord = Record<string, unknown>;

interface DetailsResponse {
  incident: SavedRecord;
  patient: SavedRecord;
  assessments: SavedRecord[];
  nurse_records: SavedRecord[];
  schedules: SavedRecord[];
  plan: SavedRecord | null;
  intake: SavedRecord | null;
  treatment_card: SavedRecord | null;
}

interface BiteCaseDetailsModalProps {
  biteId: number;
  caseNumber: string;
  onClose: () => void;
}

// ── Constants & Lookup Labels ────────────────────────────────────────────────

const TABS = [
  'Form 1 – Registration',
  'Form 2 – Doctor Assessment',
  'Form 3 – Nurse Treatment',
  'Patient History',
] as const;

const CIVIL_STATUS_LABELS: Record<string, string> = {
  single: 'Single',
  married: 'Married',
  widowed: 'Widowed',
  separated: 'Separated',
  annulled: 'Annulled',
  cohabitation: 'Co-Habitation',
};

const EDUCATIONAL_ATTAINMENT_LABELS: Record<string, string> = {
  no_formal: 'No Formal Education',
  elementary: 'Elementary',
  high_school: 'High School',
  vocational: 'Vocational',
  college: 'College',
  post_graduate: 'Post Graduate',
};

const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  employed: 'Employed',
  unemployed: 'None/Unemployed',
  self_employed: 'Self-Employed',
  retired: 'Retired',
  student: 'Student',
};

const FAMILY_MEMBER_LABELS: Record<string, string> = {
  father: 'Father (Ama)',
  mother: 'Mother (Ina)',
  son: 'Son (Anak na Lalaki)',
  daughter: 'Daughter (Anak na Babae)',
  others: 'Others',
};

const PHILHEALTH_STATUS_LABELS: Record<string, string> = {
  member: 'Member',
  dependent: 'Dependent',
};

const PHILHEALTH_CATEGORY_LABELS: Record<string, string> = {
  fe_private: 'FE – Private',
  fe_government: 'FE – Government',
  ie: 'IE',
  others: 'Others',
};

const ANIMAL_TYPE_LABELS: Record<string, string> = {
  dog: 'Dog',
  cat: 'Cat',
  other: 'Other',
};

const ANIMAL_STATUS_LABELS: Record<string, string> = {
  owned: 'Owned',
  stray: 'Stray',
  unknown: 'Unknown',
};

const ANIMAL_OBSERVATION_LABELS: Record<string, string> = {
  healthy: 'Healthy',
  sick: 'Sick',
  died: 'Dead',
  unknown: 'Unknown',
};

const CONSULTATION_TYPE_LABELS: Record<string, string> = {
  animal_bite: 'Animal Bite Exposure',
  wound_care: 'Wound Care / Dressing',
  rabies_vaccination: 'Anti-Rabies Prophylaxis',
  tetanus_prophylaxis: 'Tetanus Prophylaxis',
  general_consultation: 'General Medical Consultation',
  follow_up: 'Follow-up Evaluation',
};

// ── Value Formatting Helpers ─────────────────────────────────────────────────

function toRecord(value: unknown): SavedRecord {
  return typeof value === 'object' && value !== null ? (value as SavedRecord) : {};
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
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '—';
  }
  if (Array.isArray(value)) {
    const items = value.map(asDisplayValue).filter((v) => v !== '—');
    return items.length > 0 ? items.join(', ') : '—';
  }
  return String(value);
}

function asDate(value: unknown): string {
  if (!value) return '—';
  const text = String(value).trim();
  if (!text) return '—';
  const date = new Date(text.includes('T') ? text : `${text}T00:00:00`);
  if (Number.isNaN(date.getTime())) return asDisplayValue(value);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function asTime(value: unknown): string {
  if (!value) return '—';
  const text = String(value).trim();
  if (!text) return '—';
  if (/(AM|PM)/i.test(text)) return text;
  try {
    const parts = text.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return text;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch {
    return text;
  }
}

function asOption(value: unknown, labels: Record<string, string>): string {
  const raw = asDisplayValue(value);
  if (raw === '—') return raw;
  const key = String(value).trim().toLowerCase();
  return labels[key] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function asYesNo(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  const raw = String(value).trim().toLowerCase();
  if (raw === 'yes' || raw === 'true' || raw === '1') return 'Yes';
  if (raw === 'no' || raw === 'false' || raw === '0') return 'No';
  if (raw === 'unknown' || raw === 'unsure') return 'Unknown';
  return asDisplayValue(value);
}

function formatPhilhealthNo(value: unknown): string {
  const raw = String(value ?? '').replace(/\D/g, '');
  if (raw.length === 12) {
    return `${raw.slice(0, 2)}-${raw.slice(2, 11)}-${raw.slice(11)}`;
  }
  return asDisplayValue(value);
}

function formatModeOfExposure(value: unknown): string {
  if (!value) return '—';
  if (typeof value === 'object' && !Array.isArray(value)) {
    const active = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    return active.length > 0 ? active.join(', ') : '—';
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      .join(', ');
  }
  const str = String(value).trim();
  if (str.startsWith('{') || str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      return formatModeOfExposure(parsed);
    } catch {
      // ignore
    }
  }
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatBodyPart(value: unknown): string {
  if (!value) return '—';
  if (typeof value === 'object' && !Array.isArray(value)) {
    const active = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    return active.length > 0 ? active.join(', ') : '—';
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      .join(', ');
  }
  const str = String(value).trim();
  if (str.startsWith('{') || str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      return formatBodyPart(parsed);
    } catch {
      // ignore
    }
  }
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatVaccineType(value: unknown): string {
  if (!value) return '—';
  const raw = String(value).trim().toLowerCase();
  if (raw.includes('pcecv') || raw.includes('chick')) {
    return 'Purified Chick Embryo Cell Vaccine (PCECV)';
  }
  if (raw.includes('pvrv') || raw.includes('vero')) {
    return 'Purified Vero Cell Rabies Vaccine (PVRV)';
  }
  if (raw === 'speeda') return 'Speeda';
  if (raw === 'verorab') return 'Verorab';
  if (raw === 'rabipur') return 'Rabipur';
  return asDisplayValue(value);
}

function formatProphylaxisOrder(value: unknown): string {
  if (!value) return 'None';
  if (typeof value === 'boolean') return value ? 'Prescribed' : 'None';
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (rec.ordered || rec.prescribed) {
      const parts = [
        rec.dose ? String(rec.dose) : null,
        rec.product ? String(rec.product) : null,
        rec.route ? String(rec.route) : null,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(' · ') : 'Prescribed';
    }
    return 'None';
  }
  return String(value);
}

function doseNumberLabel(n: unknown): string {
  const num = Number(n);
  if (Number.isNaN(num)) return 'Dose';
  if (num === 0) return 'Day 0';
  if (num === 3) return 'Day 3';
  if (num === 7) return 'Day 7';
  if (num === 14) return 'Day 14';
  if (num === 28) return 'Day 28';
  if (num === 90) return 'Booster 1';
  if (num === 91) return 'Booster 2';
  return `Day ${num}`;
}

function getStaffName(record: SavedRecord): string {
  const admin = record.administered_by || record.administeredBy;
  if (admin && typeof admin === 'object') {
    return String((admin as SavedRecord).name || 'Staff Nurse');
  }
  if (typeof admin === 'string' && admin.trim()) {
    return admin.trim();
  }
  return 'Staff Nurse';
}

// ── Reusable Read-Only Clinical Components ───────────────────────────────────

function ReadOnlySection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        bgcolor: 'var(--card-bg-solid, #ffffff)',
        border: '1px solid var(--border-glow, #e5e7eb)',
        borderRadius: 2.5,
        p: { xs: 2, sm: 2.5 },
        mb: 2.5,
        '&:last-of-type': { mb: 0 },
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 700,
            color: '#10b981',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: 12, color: 'var(--text-m, #6b7280)', mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {children}
    </Box>
  );
}

function ReadOnlyField({
  label,
  value,
  fullWidth = false,
  badge,
  badgeTone = 'default',
}: {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
  badge?: string;
  badgeTone?: 'green' | 'amber' | 'red' | 'blue' | 'default';
}) {
  return (
    <Box sx={{ gridColumn: fullWidth ? { xs: '1 / -1' } : undefined }}>
      <Typography
        component="div"
        sx={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-m, #64748b)',
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          mb: 0.6,
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          bgcolor: 'var(--input-bg, #f8fafc)',
          border: '1px solid var(--border-glow, #e2e8f0)',
          borderRadius: 1.5,
          px: 1.75,
          py: 1,
          minHeight: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: 13.5,
            fontWeight: 500,
            color: 'var(--text-h, #0f172a)',
            wordBreak: 'break-word',
            lineHeight: 1.4,
          }}
        >
          {value || '—'}
        </Typography>
        {badge && (
          <Chip
            label={badge}
            size="small"
            sx={{
              height: 22,
              fontSize: 11,
              fontWeight: 600,
              bgcolor:
                badgeTone === 'green' ? 'rgba(16, 185, 129, 0.15)' :
                badgeTone === 'amber' ? 'rgba(245, 158, 11, 0.15)' :
                badgeTone === 'red' ? 'rgba(239, 68, 68, 0.15)' :
                badgeTone === 'blue' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(107, 114, 128, 0.1)',
              color:
                badgeTone === 'green' ? '#047857' :
                badgeTone === 'amber' ? '#b45309' :
                badgeTone === 'red' ? '#b91c1c' :
                badgeTone === 'blue' ? '#1d4ed8' : '#475569',
              border: '1px solid',
              borderColor:
                badgeTone === 'green' ? 'rgba(16, 185, 129, 0.3)' :
                badgeTone === 'amber' ? 'rgba(245, 158, 11, 0.3)' :
                badgeTone === 'red' ? 'rgba(239, 68, 68, 0.3)' :
                badgeTone === 'blue' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(107, 114, 128, 0.2)',
            }}
          />
        )}
      </Box>
    </Box>
  );
}

function EmptyStateCard({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <Box
      sx={{
        p: 4,
        textAlign: 'center',
        bgcolor: 'var(--card-bg-solid, #ffffff)',
        border: '1px solid var(--border-glow, #e5e7eb)',
        borderRadius: 2.5,
        my: 2,
      }}
    >
      <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'var(--text-h, #374151)', mb: 1 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: 13, color: 'var(--text-m, #6b7280)', maxWidth: 520, mx: 'auto', lineHeight: 1.5 }}>
        {message}
      </Typography>
    </Box>
  );
}

// ── Tab 1: Form 1 – Patient Registration ─────────────────────────────────────

function Form1TabView({
  patient,
  incident,
  consultation,
}: {
  patient: SavedRecord;
  incident: SavedRecord;
  consultation: SavedRecord | null;
}) {
  const details = toRecord(patient.details);
  const memberships = getPatientMemberships(patient);

  const philhealth = getMembershipByType(memberships, 'philhealth');
  const fourps = getMembershipByType(memberships, 'fourps');
  const dswd = getMembershipByType(memberships, 'dswd_nhts');
  const senior = getMembershipByType(memberships, 'senior_citizen');
  const pwd = getMembershipByType(memberships, 'pwd');
  const indigenous = getMembershipByType(memberships, 'indigenous_member');
  const other = getMembershipByType(memberships, 'other');

  const civilStatusRaw = firstNonEmpty(details.civil_status, patient.civil_status);
  const spouseRaw = firstNonEmpty(details.spouse_name, patient.spouse_name);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header Banner */}
      <Box sx={{ mb: 2.5, px: 0.5 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h, #111827)' }}>
          Patient Enrolment & Demographic Record
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'var(--text-m, #6b7280)', mt: 0.25 }}>
          Official DOH Form 1 record saved during patient intake and registration.
        </Typography>
      </Box>

      {/* Section I: Patient Information */}
      <ReadOnlySection title="I. Patient Information (Impormasyon ng Pasyente)">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
          <ReadOnlyField label="Last Name (Apelyido)" value={asDisplayValue(patient.last_name)} />
          <ReadOnlyField label="First Name (Pangalan)" value={asDisplayValue(patient.first_name)} />
          <ReadOnlyField label="Middle Name (Gitnang)" value={asDisplayValue(patient.middle_name)} />
          <ReadOnlyField label="Suffix" value={asDisplayValue(patient.suffix)} />
          <ReadOnlyField label="Age (Edad)" value={patient.age ? `${patient.age} years old` : '—'} />
          <ReadOnlyField label="Sex (Kasarian)" value={asOption(firstNonEmpty(patient.sex, patient.gender), { male: 'Male', female: 'Female' })} />
          <ReadOnlyField label="Date of Birth" value={asDate(patient.date_of_birth)} />
          <ReadOnlyField label="Blood Type" value={asDisplayValue(firstNonEmpty(details.blood_type, patient.blood_type))} />
          <ReadOnlyField label="Mother's Maiden Name" value={asDisplayValue(details.mother_maiden_name)} />
          <ReadOnlyField label="Civil Status" value={asOption(civilStatusRaw, CIVIL_STATUS_LABELS)} />
          {(String(civilStatusRaw ?? '').toLowerCase() === 'married' || asDisplayValue(spouseRaw) !== '—') && (
            <ReadOnlyField label="Spouse's Name" value={asDisplayValue(spouseRaw)} />
          )}
        </Box>
      </ReadOnlySection>

      {/* Section: Residential Address */}
      <ReadOnlySection title="Residential Address — Misamis Oriental (Tirahan)">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
          <ReadOnlyField label="City / Municipality" value={asDisplayValue(firstNonEmpty(details.address_municipality, patient.address_municipality))} />
          <ReadOnlyField label="Barangay" value={asDisplayValue(firstNonEmpty(details.address_barangay, patient.address_barangay))} />
          <ReadOnlyField label="Purok / Zone / Street" value={asDisplayValue(firstNonEmpty(details.address_purok, patient.address_purok))} />
          <ReadOnlyField label="Residential Address (Tirahan)" value={asDisplayValue(patient.address)} />
        </Box>
      </ReadOnlySection>

      {/* Section: Contact Information */}
      <ReadOnlySection title="Contact Information">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
          <ReadOnlyField label="Contact Number (Mobile)" value={asDisplayValue(patient.contact_number)} />
          <ReadOnlyField label="Email Address" value={asDisplayValue(patient.email)} />
          <ReadOnlyField label="Emergency Contact Name" value={asDisplayValue(patient.emergency_contact_name)} />
          <ReadOnlyField label="Emergency Contact Phone" value={asDisplayValue(firstNonEmpty(patient.emergency_contact_number, patient.emergency_contact_phone))} />
        </Box>
      </ReadOnlySection>

      {/* Section: Socioeconomic Information */}
      <ReadOnlySection title="Socioeconomic Information">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
          <ReadOnlyField label="Educational Attainment" value={asOption(firstNonEmpty(details.educational_attainment, patient.educational_attainment), EDUCATIONAL_ATTAINMENT_LABELS)} />
          <ReadOnlyField label="Employment Status" value={asOption(firstNonEmpty(details.employment_status, patient.employment_status), EMPLOYMENT_STATUS_LABELS)} />
          <ReadOnlyField label="Family Member Position" value={asOption(firstNonEmpty(details.family_member, patient.family_member), FAMILY_MEMBER_LABELS)} />
        </Box>
      </ReadOnlySection>

      {/* Section II: Government Program Information */}
      <ReadOnlySection title="II. Government Program Information">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
          <ReadOnlyField label="Any Membership?" value={asYesNo(memberships.length > 0 ? 'yes' : details.has_membership)} />
          <ReadOnlyField label="PhilHealth Member?" value={asYesNo(philhealth ? 'yes' : details.philhealth_member)} />
          <ReadOnlyField label="Status Type" value={asOption(firstNonEmpty(philhealth?.status_value, details.philhealth_status), PHILHEALTH_STATUS_LABELS)} />
          <ReadOnlyField label="PhilHealth No." value={formatPhilhealthNo(firstNonEmpty(philhealth?.membership_id_no, details.philhealth_no))} />
          <ReadOnlyField label="Category" value={asOption(firstNonEmpty(philhealth?.category, details.philhealth_category), PHILHEALTH_CATEGORY_LABELS)} />
          <ReadOnlyField label="4Ps Member?" value={asYesNo(fourps ? 'yes' : details.fourps_member)} />
          <ReadOnlyField label="4Ps Category" value={asDisplayValue(firstNonEmpty(fourps?.category, details.fourps_category))} />
          <ReadOnlyField label="4Ps Relationship" value={asDisplayValue(firstNonEmpty(fourps?.relationship_value, details.fourps_relationship))} />
          <ReadOnlyField label="Registered 4Ps Beneficiary" value={asDisplayValue(firstNonEmpty(fourps?.registered_beneficiary, details.registered_fourps_beneficiary))} />
          <ReadOnlyField label="DSWD NHTS?" value={asYesNo(dswd ? 'yes' : details.dswd_nhts)} />
          <ReadOnlyField label="Senior Citizen ID" value={asDisplayValue(senior?.membership_id_no)} />
          <ReadOnlyField label="PWD ID" value={asDisplayValue(pwd?.membership_id_no)} />
          <ReadOnlyField label="Indigenous Tribe" value={asDisplayValue(indigenous?.extra_value)} />
          <ReadOnlyField label="Other Membership" value={asDisplayValue(other?.membership_label)} />
          <ReadOnlyField label="Other Membership ID" value={asDisplayValue(other?.membership_id_no)} />
        </Box>
      </ReadOnlySection>

      {/* Section III: Consultation Details & Vitals */}
      <ReadOnlySection title="III. Consultation Details & Vitals">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
          <ReadOnlyField
            label="Date of Consultation"
            value={asDate(firstNonEmpty(consultation?.consultation_date, incident.reg_date_of_consultation, incident.bite_date))}
          />
          <ReadOnlyField
            label="Consultation Time (AM/PM)"
            value={asTime(firstNonEmpty(consultation?.consultation_time, incident.reg_consultation_time))}
          />
          <ReadOnlyField
            label="Blood Pressure (mmHg)"
            value={asDisplayValue(firstNonEmpty(consultation?.blood_pressure, incident.reg_blood_pressure))}
          />
          <ReadOnlyField
            label="Temperature (°C)"
            value={consultation?.temperature ? `${consultation.temperature} °C` : incident.reg_temperature ? `${incident.reg_temperature} °C` : '—'}
          />
          <ReadOnlyField
            label="Height (cm)"
            value={consultation?.height ? `${consultation.height} cm` : incident.reg_height ? `${incident.reg_height} cm` : '—'}
          />
          <ReadOnlyField
            label="Weight (kg)"
            value={consultation?.weight ? `${consultation.weight} kg` : incident.reg_weight ? `${incident.reg_weight} kg` : '—'}
          />
          <ReadOnlyField
            label="Name of Attending Provider"
            value={asDisplayValue(firstNonEmpty(consultation?.attending_provider, consultation?.provider_name, incident.reg_attending_provider))}
          />
          <ReadOnlyField
            label="Referred By"
            value={asDisplayValue(firstNonEmpty(consultation?.referred_by, consultation?.referred_from, incident.reg_referred_by))}
          />
        </Box>
      </ReadOnlySection>

      <OnlineReferralPhoto patient={patient} />
    </Box>
  );
}

// ── Tab 2: Form 2 – Doctor Assessment ────────────────────────────────────────

function Form2TabView({
  incident,
  assessments,
  plan,
  intake,
}: {
  incident: SavedRecord;
  assessments: SavedRecord[];
  plan: SavedRecord | null;
  intake: SavedRecord | null;
}) {
  if (!assessments || assessments.length === 0) {
    return (
      <EmptyStateCard
        title="No Doctor Assessment Recorded Yet"
        message="The doctor has not yet completed a clinical assessment for this bite incident. The case is currently awaiting clinical evaluation in Station 1 (Doctor Assessment)."
      />
    );
  }

  const doc = assessments[0];
  const exposureCategory = String(firstNonEmpty(doc.exposure_category, incident.exposure_category, '—')).toUpperCase();
  const isCategory1 = exposureCategory === 'I';
  const categoryTone = exposureCategory === 'III' ? 'red' : exposureCategory === 'II' ? 'amber' : 'green';

  const isTransferred = Boolean(
    incident.transferred_to_facility ||
    incident.status === 'transferred_out' ||
    doc.referred_to ||
    doc.reason_for_referral
  );

  const prescribedVaccine = (() => {
    if (isCategory1) return 'Not Indicated (Category I)';
    if (doc.prescribed_vaccine_type) return formatVaccineType(doc.prescribed_vaccine_type);
    if (plan?.protocol_type) return String(plan.protocol_type).replace(/_/g, ' ').toUpperCase();
    return asDisplayValue(doc.medication_treatment || 'Prescribed');
  })();

  const prophylaxisOrders = toRecord(doc.prophylaxis_orders);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header Banner */}
      <Box sx={{ mb: 2.5, px: 0.5 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h, #111827)' }}>
          Doctor Assessment & Treatment Prescription — Form 2
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'var(--text-m, #6b7280)', mt: 0.25 }}>
          Clinical examination findings, diagnosis, and prescription recorded by the attending physician.
        </Typography>
      </Box>

      {/* 1. Consultation Details & Vitals */}
      <ReadOnlySection title="1. Consultation Details & Vitals">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
          <ReadOnlyField label="Date of Consultation" value={asDate(doc.consultation_date)} />
          <ReadOnlyField label="Consultation Time" value={asTime(doc.consultation_time)} />
          <ReadOnlyField
            label="Attending Provider / Physician"
            value={asDisplayValue(firstNonEmpty(doc.attending_provider, doc.provider_name))}
          />
          <ReadOnlyField
            label="Referred By"
            value={asDisplayValue(firstNonEmpty(doc.referred_by, doc.referred_from, 'Walk-in / None'))}
          />
          <ReadOnlyField label="Blood Pressure (mmHg)" value={asDisplayValue(doc.blood_pressure)} />
          <ReadOnlyField label="Temperature (°C)" value={doc.temperature ? `${doc.temperature} °C` : '—'} />
          <ReadOnlyField label="Height (cm)" value={doc.height ? `${doc.height} cm` : '—'} />
          <ReadOnlyField label="Weight (kg)" value={doc.weight ? `${doc.weight} kg` : '—'} />
          {Boolean(doc.heart_rate) && (
            <ReadOnlyField label="Heart Rate (bpm)" value={`${doc.heart_rate} bpm`} />
          )}
          {Boolean(doc.respiratory_rate) && (
            <ReadOnlyField label="Respiratory Rate (/min)" value={`${doc.respiratory_rate} /min`} />
          )}
        </Box>
      </ReadOnlySection>

      {/* 2. Nature of Visit & Consultation Details */}
      <ReadOnlySection title="2. Nature of Visit & Consultation Details">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
          <ReadOnlyField
            label="Nature of Visit"
            value={asOption(doc.nature_of_visit, {
              new_consultation: 'New Consultation',
              follow_up: 'Follow-up Consultation',
              re_exposure: 'Re-Exposure Consultation',
            })}
          />
          <ReadOnlyField
            label="Consultation Type(s)"
            value={asOption(doc.consultation_types, CONSULTATION_TYPE_LABELS)}
          />
          <ReadOnlyField
            label="Chief Complaints"
            value={asDisplayValue(doc.chief_complaints)}
            fullWidth
          />
          <ReadOnlyField
            label="Pertinent Clinical History"
            value={asDisplayValue(doc.pertinent_history)}
            fullWidth
          />
        </Box>
      </ReadOnlySection>

      {/* 3. Place of Exposure (Preserve exact Form 2 order: Place of Exposure -> Exposure Category -> Transfer Out) */}
      <ReadOnlySection title="3. Place of Exposure">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
          <ReadOnlyField
            label="Date of Exposure"
            value={asDate(firstNonEmpty(incident.bite_date, doc.bite_date))}
          />
          <ReadOnlyField
            label="Place of Exposure"
            value={asDisplayValue(firstNonEmpty(incident.bite_place, doc.bite_place, intake?.place_of_exposure))}
          />
          <ReadOnlyField
            label="Wound Washed with Soap and Water"
            value={incident.site_washed ? 'Yes (Soap & Water)' : incident.site_washed === false ? 'No' : '—'}
          />
          <ReadOnlyField
            label="Biting Animal"
            value={[
              ANIMAL_TYPE_LABELS[String(incident.animal_type).toLowerCase()] || asDisplayValue(incident.animal_type),
              incident.animal_status ? `(${ANIMAL_STATUS_LABELS[String(incident.animal_status).toLowerCase()] || incident.animal_status})` : null,
            ].filter(Boolean).join(' ')}
          />
        </Box>
      </ReadOnlySection>

      {/* 4. Exposure Category & Clinical Diagnosis */}
      <ReadOnlySection title="4. Exposure Category & Clinical Diagnosis">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
          <ReadOnlyField
            label="WHO Exposure Category"
            value={`Category ${exposureCategory}`}
            badge={`Category ${exposureCategory}`}
            badgeTone={categoryTone}
          />
          <ReadOnlyField
            label="Doctor’s Diagnosis"
            value={asDisplayValue(doc.diagnosis || (exposureCategory !== '—' ? `Animal Bite Exposure — Category ${exposureCategory}` : '—'))}
          />
          <ReadOnlyField
            label="Clinical Findings / Doctor's Notes"
            value={asDisplayValue(firstNonEmpty(doc.doctor_notes, doc.assessment_summary, doc.remarks))}
            fullWidth
          />
        </Box>
      </ReadOnlySection>

      {/* 5. Transfer Out / Referral Slip (Preserved according to existing Form 2) */}
      {isTransferred && (
        <ReadOnlySection title="5. Transfer Out / Referral Slip">
          <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
            This patient case was transferred / referred to an external health facility.
          </Alert>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
            <ReadOnlyField
              label="Transferred / Referred To Facility"
              value={asDisplayValue(firstNonEmpty(incident.transferred_to_facility, doc.referred_to))}
            />
            <ReadOnlyField
              label="Date of Transfer / Referral"
              value={asDate(firstNonEmpty(incident.transferred_at, doc.consultation_date))}
            />
            <ReadOnlyField
              label="Reason for Referral"
              value={asDisplayValue(firstNonEmpty(incident.transfer_reason, doc.reason_for_referral))}
              fullWidth
            />
            <ReadOnlyField
              label="Transfer Status"
              value="Transferred / Referred"
              badge="Transferred Out"
              badgeTone="blue"
            />
          </Box>
        </ReadOnlySection>
      )}

      {/* 6. Prescriptions & Prophylaxis Orders */}
      <ReadOnlySection title="6. Prescriptions & Prophylaxis Orders">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
          <ReadOnlyField
            label="Prescribed Rabies Vaccine"
            value={prescribedVaccine}
            badge={isCategory1 ? 'Not Indicated' : undefined}
            badgeTone={isCategory1 ? 'green' : 'default'}
          />
          <ReadOnlyField
            label="Medication / Treatment Instructions"
            value={asDisplayValue(doc.medication_treatment || (isCategory1 ? 'No PEP vaccine prescribed' : 'Standard regimen'))}
          />
          <ReadOnlyField
            label="Tetanus Toxoid (TT)"
            value={formatProphylaxisOrder(firstNonEmpty(prophylaxisOrders.tt, doc.prescribed_tt))}
          />
          <ReadOnlyField
            label="Anti-Tetanus Serum (ATS)"
            value={formatProphylaxisOrder(firstNonEmpty(prophylaxisOrders.ats, doc.prescribed_ats))}
          />
          <ReadOnlyField
            label="Rabies Immunoglobulin (RIG)"
            value={formatProphylaxisOrder(firstNonEmpty(prophylaxisOrders.rig, doc.prescribed_rig, exposureCategory === 'III' ? 'Indicated' : 'Not Indicated'))}
          />
        </Box>
      </ReadOnlySection>

      {/* 7. Clinical Addendum & Progress Notes */}
      {Boolean(doc.administration_notes) && (
        <ReadOnlySection title="7. Clinical Addendum & Progress Notes">
          <ReadOnlyField
            label="Addendum Notes"
            value={asDisplayValue(doc.administration_notes)}
            fullWidth
          />
        </ReadOnlySection>
      )}
    </Box>
  );
}

// ── Tab 3: Form 3 – Nurse Treatment ──────────────────────────────────────────

function Form3TabView({
  incident,
  treatmentCard,
  nurseRecords,
  schedules,
}: {
  incident: SavedRecord;
  treatmentCard: SavedRecord | null;
  nurseRecords: SavedRecord[];
  schedules: SavedRecord[];
}) {
  const hasNurseData = Boolean(
    treatmentCard ||
    (nurseRecords && nurseRecords.length > 0) ||
    (schedules && schedules.length > 0)
  );

  if (!hasNurseData) {
    return (
      <EmptyStateCard
        title="No Nurse Treatment Record Available"
        message="No nurse treatment was recorded for this bite incident."
      />
    );
  }

  const category = String(
    firstNonEmpty(treatmentCard?.exposure_category, incident.exposure_category, '—')
  ).toUpperCase();
  const isCategory1 = category === 'I';
  const categoryTone = category === 'III' ? 'red' : category === 'II' ? 'amber' : 'green';

  // Merge administered records and schedules chronologically
  const doseRows: Array<{
    doseNumber: number;
    period: string;
    scheduledDate: string;
    treatmentDate: string;
    vaccineBrand: string;
    routeSite: string;
    dosageMl: string;
    batchNo: string;
    nurseName: string;
    status: string;
  }> = [];

  const seenDoses = new Set<number>();

  // 1. Administered nurse records
  (nurseRecords || []).forEach((r) => {
    if (r.dose_number !== null && r.dose_number !== undefined) {
      const dNum = Number(r.dose_number);
      seenDoses.add(dNum);
      doseRows.push({
        doseNumber: dNum,
        period: doseNumberLabel(dNum),
        scheduledDate: asDate(r.scheduled_date),
        treatmentDate: asDate(firstNonEmpty(r.treatment_date, r.administered_at)),
        vaccineBrand: asDisplayValue(firstNonEmpty(r.vaccine_brand, r.vaccine_generic, 'Anti-rabies vaccine')),
        routeSite: [
          r.route ? String(r.route).toUpperCase() : 'IM',
          r.injection_site ? String(r.injection_site) : null,
        ].filter(Boolean).join(' · '),
        dosageMl: r.dosage_ml ? `${r.dosage_ml} mL` : '—',
        batchNo: asDisplayValue(r.batch_no),
        nurseName: getStaffName(r),
        status: 'Administered',
      });
    }
  });

  // 2. Scheduled doses not yet administered
  (schedules || []).forEach((s) => {
    if (s.dose_number !== null && s.dose_number !== undefined) {
      const dNum = Number(s.dose_number);
      if (!seenDoses.has(dNum)) {
        seenDoses.add(dNum);
        doseRows.push({
          doseNumber: dNum,
          period: doseNumberLabel(dNum),
          scheduledDate: asDate(s.scheduled_date),
          treatmentDate: '—',
          vaccineBrand: asDisplayValue(firstNonEmpty(s.vaccine_brand, s.vaccine_generic)),
          routeSite: '—',
          dosageMl: s.dosage_ml ? `${s.dosage_ml} mL` : '—',
          batchNo: '—',
          nurseName: '—',
          status: s.status === 'missed' ? 'Missed' : 'Scheduled',
        });
      }
    }
  });

  doseRows.sort((a, b) => a.doseNumber - b.doseNumber);

  // Prophylaxis medications (ATS, TT, RIG) administered
  const prophylaxisItems = (nurseRecords || []).filter(
    (r) => r.dose_number === null && (r.medication_given || r.dose_iu || r.tt_status)
  );

  const animalSpecies = (() => {
    const type = String(firstNonEmpty(treatmentCard?.animal_type, incident.animal_type) || '').toLowerCase();
    const other = firstNonEmpty(treatmentCard?.animal_type_others, incident.animal_type_others);
    if (type === 'other' && other) {
      return `Other (${other})`;
    }
    return ANIMAL_TYPE_LABELS[type] || asDisplayValue(firstNonEmpty(treatmentCard?.animal_type, incident.animal_type));
  })();

  const animalOwnership = asOption(firstNonEmpty(treatmentCard?.animal_status, incident.animal_status), ANIMAL_STATUS_LABELS);
  const animalAvailable = (() => {
    const avail = firstNonEmpty(treatmentCard?.animal_available, incident.animal_available);
    if (avail === true || avail === 'yes' || avail === 1) return 'Yes';
    if (avail === false || avail === 'no' || avail === 0) return 'No';
    if (avail === null || avail === undefined) {
      return (incident.animal_available_answered || treatmentCard?.animal_available_answered) ? 'Unknown' : '—';
    }
    return asDisplayValue(avail);
  })();
  const animalCondition = asOption(
    firstNonEmpty(treatmentCard?.animal_observation_status, incident.animal_observation_status, treatmentCard?.animal_condition, incident.animal_condition),
    ANIMAL_OBSERVATION_LABELS
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header Banner */}
      <Box sx={{ mb: 2.5, px: 0.5 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h, #111827)' }}>
          Nurse Treatment Record — Form 3
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'var(--text-m, #6b7280)', mt: 0.25 }}>
          Official vaccination administration card, dose schedule, and injection log.
        </Typography>
      </Box>

      {/* Card Header Information */}
      <ReadOnlySection title="Nurse Treatment Card Overview">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
          <ReadOnlyField
            label="Registry / Case No."
            value={asDisplayValue(firstNonEmpty(treatmentCard?.registry_no, incident.case_number))}
          />
          <ReadOnlyField
            label="Card Date / Date Treatment Started"
            value={asDate(firstNonEmpty(treatmentCard?.card_date, nurseRecords?.[0]?.treatment_date, nurseRecords?.[0]?.administered_at))}
          />
          <ReadOnlyField
            label="WHO Exposure Category"
            value={`Category ${category}`}
            badge={`Category ${category}`}
            badgeTone={categoryTone}
          />
          <ReadOnlyField
            label="Past Bite History"
            value={asYesNo(firstNonEmpty(treatmentCard?.past_bite_history, treatmentCard?.past_history_bite))}
          />
          <ReadOnlyField
            label="Previous Rabies Vaccination"
            value={asOption(firstNonEmpty(treatmentCard?.past_pep_completed, treatmentCard?.pep_completed), {
              completed: 'Completed',
              incomplete: 'Incomplete',
              none: 'None',
              unsure: 'Unsure',
              true: 'Completed',
              false: 'None',
            })}
          />
        </Box>
      </ReadOnlySection>

      {/* 1. Exposure Section */}
      <ReadOnlySection title="1. Exposure">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
          <ReadOnlyField
            label="Mode of Exposure"
            value={formatModeOfExposure(firstNonEmpty(treatmentCard?.mode_of_exposure, incident.exposure_type))}
          />
          <ReadOnlyField
            label="Body Part Affected"
            value={formatBodyPart(firstNonEmpty(treatmentCard?.body_part_exposed, incident.body_part_exposed))}
          />
          <ReadOnlyField
            label="Exact Location / Details"
            value={asDisplayValue(firstNonEmpty(treatmentCard?.body_part_affected_text, incident.bite_place))}
            fullWidth
          />
        </Box>

        {/* Animal Section */}
        <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px dashed var(--border-glow, #e5e7eb)' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h, #374151)', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            Animal
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
            <ReadOnlyField label="Species" value={animalSpecies} />
            <ReadOnlyField label="Ownership" value={animalOwnership} />
            <ReadOnlyField label="Available for 14-day observation" value={animalAvailable} />
            <ReadOnlyField label="Condition" value={animalCondition} />
          </Box>
        </Box>
      </ReadOnlySection>

      {/* 2. History Section */}
      <ReadOnlySection title="2. History">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
          <ReadOnlyField
            label="Past Animal Bite"
            value={asYesNo(firstNonEmpty(treatmentCard?.past_bite_history, treatmentCard?.past_history_bite))}
          />
          <ReadOnlyField
            label="Approximate Previous Bite Date(s)"
            value={asDisplayValue(treatmentCard?.past_bite_dates)}
          />
          <ReadOnlyField
            label="Previous Rabies Vaccination"
            value={asOption(firstNonEmpty(treatmentCard?.past_pep_completed, treatmentCard?.pep_completed), {
              completed: 'Completed',
              incomplete: 'Incomplete',
              none: 'None',
              unsure: 'Unsure',
              true: 'Completed',
              false: 'None',
            })}
          />
        </Box>
      </ReadOnlySection>

      {/* 3. Vaccination Record */}
      <ReadOnlySection title="3. Vaccination Record">
        {isCategory1 ? (
          <Box
            sx={{
              p: 2.5,
              bgcolor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label="Category I – No PEP Required"
                size="small"
                sx={{ bgcolor: '#16a34a', color: '#ffffff', fontWeight: 700 }}
              />
              <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: '#166534' }}>
                No Rabies PEP Vaccine Prescribed
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 12.5, color: '#15803d', lineHeight: 1.5 }}>
              Per Philippine clinical guidelines, Rabies Post-Exposure Prophylaxis (PEP) vaccine is not indicated for Category I exposures. No nurse-administered anti-rabies treatments were indicated for this case.
            </Typography>
          </Box>
        ) : doseRows.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'var(--text-m, #6b7280)', fontStyle: 'italic', p: 1 }}>
            No vaccination administration records or schedule entries saved yet.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Box
              component="table"
              sx={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12.5,
                '& th': {
                  textAlign: 'left',
                  p: '8px 12px',
                  bgcolor: '#f8fafc',
                  color: 'var(--text-m, #475569)',
                  fontWeight: 700,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  borderBottom: '1px solid #e2e8f0',
                },
                '& td': {
                  p: '10px 12px',
                  borderBottom: '1px solid #f1f5f9',
                  color: 'var(--text-h, #1e293b)',
                  verticalAlign: 'middle',
                },
              }}
            >
              <thead>
                <tr>
                  <th>Dose / Period</th>
                  <th>Scheduled Date</th>
                  <th>Date Given</th>
                  <th>Vaccine Brand</th>
                  <th>Route · Site</th>
                  <th>Dosage</th>
                  <th>Batch / Lot No.</th>
                  <th>Administered By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {doseRows.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{row.period}</td>
                    <td>{row.scheduledDate}</td>
                    <td>{row.treatmentDate}</td>
                    <td>{row.vaccineBrand}</td>
                    <td>{row.routeSite}</td>
                    <td>{row.dosageMl}</td>
                    <td>{row.batchNo}</td>
                    <td>{row.nurseName}</td>
                    <td>
                      <Chip
                        label={row.status}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: 11,
                          fontWeight: 600,
                          bgcolor: row.status === 'Administered' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: row.status === 'Administered' ? '#047857' : '#1d4ed8',
                          border: '1px solid',
                          borderColor: row.status === 'Administered' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
        )}
      </ReadOnlySection>

      {/* 4. Prophylaxis Administration (Tetanus & RIG) */}
      {prophylaxisItems.length > 0 && (
        <ReadOnlySection title="4. Prophylaxis Administration (Tetanus & RIG)">
          <Box sx={{ overflowX: 'auto' }}>
            <Box
              component="table"
              sx={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12.5,
                '& th': {
                  textAlign: 'left',
                  p: '8px 12px',
                  bgcolor: '#f8fafc',
                  color: 'var(--text-m, #475569)',
                  fontWeight: 700,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  borderBottom: '1px solid #e2e8f0',
                },
                '& td': {
                  p: '10px 12px',
                  borderBottom: '1px solid #f1f5f9',
                  color: 'var(--text-h, #1e293b)',
                  verticalAlign: 'middle',
                },
              }}
            >
              <thead>
                <tr>
                  <th>Medication / Prophylaxis</th>
                  <th>Product / Brand</th>
                  <th>Dose · Route · Site</th>
                  <th>Date Administered</th>
                  <th>Administered By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {prophylaxisItems.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>
                      {asDisplayValue(item.medication_given || item.protocol_type || 'Prophylaxis')}
                    </td>
                    <td>{asDisplayValue(firstNonEmpty(item.vaccine_brand, item.vaccine_generic))}</td>
                    <td>
                      {[
                        item.dosage_ml ? `${item.dosage_ml} mL` : null,
                        item.dose_iu ? `${item.dose_iu} IU` : null,
                        item.route ? String(item.route).toUpperCase() : null,
                        item.injection_site ? String(item.injection_site) : null,
                      ].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td>{asDate(firstNonEmpty(item.treatment_date, item.administered_at))}</td>
                    <td>{getStaffName(item)}</td>
                    <td>
                      <Chip
                        label="Administered"
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: 11,
                          fontWeight: 600,
                          bgcolor: 'rgba(16, 185, 129, 0.15)',
                          color: '#047857',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
        </ReadOnlySection>
      )}
    </Box>
  );
}

// ── Tab 4: Patient History ───────────────────────────────────────────────────

function PatientHistoryTabView({
  selectedBiteId,
  patient,
  cardData,
  episodes,
  historySummary,
  loadingHistory,
  onSelectEpisode,
  selectedEpisodeId,
  onNavigateTab,
}: {
  selectedBiteId: number;
  patient: SavedRecord;
  cardData: SavedRecord | null;
  episodes: SavedRecord[];
  historySummary: SavedRecord | null;
  loadingHistory: boolean;
  onSelectEpisode: (biteId: number) => void;
  selectedEpisodeId: number | null;
  onNavigateTab: (tabIndex: number) => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Selected Map Incident Context Banner */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="Current Map Marker Case"
            size="small"
            sx={{
              bgcolor: '#059669',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 11,
              height: 24,
            }}
          />
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#065f46' }}>
            Bite Case #{asDisplayValue(patient.case_number || (cardData?.bite_incident as SavedRecord)?.case_number)}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 12, color: '#047857', fontWeight: 500 }}>
          Viewing complete clinical timeline & patient treatment history
        </Typography>
      </Box>

      {/* Multiple Episodes Switcher */}
      {episodes.length > 1 && (
        <Box
          sx={{
            p: 1.75,
            bgcolor: 'var(--card-bg-solid, #ffffff)',
            border: '1px solid var(--border-glow, #e2e8f0)',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            flexWrap: 'wrap',
          }}
        >
          <Typography
            sx={{
              fontSize: 11.5,
              fontWeight: 700,
              color: 'var(--text-m, #475569)',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            Historical Incidents:
          </Typography>
          {episodes.map((ep) => {
            const epBiteId = Number(ep.bite_id);
            const isMapIncident = epBiteId === selectedBiteId;
            const isCurrentlySelected = (selectedEpisodeId || selectedBiteId) === epBiteId;

            return (
              <Chip
                key={epBiteId}
                label={`Episode #${ep.episode_number} (${ep.episode_type === 'pending_assessment' ? 'Awaiting Doctor' : ep.episode_type === 're_exposure' ? 'Re-Exposure' : 'Primary PEP'} • ${ep.status})${isMapIncident ? ' ★ Selected on Map' : ''}`}
                onClick={() => onSelectEpisode(epBiteId)}
                color={isCurrentlySelected ? 'success' : 'default'}
                variant={isCurrentlySelected ? 'filled' : 'outlined'}
                size="small"
                sx={{
                  fontWeight: isCurrentlySelected ? 700 : 500,
                  fontSize: 12,
                  cursor: 'pointer',
                  borderColor: isMapIncident ? '#10b981' : undefined,
                }}
              />
            );
          })}
        </Box>
      )}

      {/* Immunization History Verified Notice */}
      {Boolean(historySummary?.has_history) && (
        <Box
          sx={{
            px: 2,
            py: 1.25,
            bgcolor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid #a7f3d0',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography sx={{ fontSize: 12.5, color: '#065f46', fontWeight: 600 }}>
            Documented rabies immunization history verified ({String(historySummary?.confidence_label || 'Verified')}).
          </Typography>
          <Chip
            label={historySummary?.can_receive_booster ? 'Booster Eligible (RIG Withheld)' : 'Primary PEP Required'}
            size="small"
            sx={{
              bgcolor: 'rgba(16, 185, 129, 0.2)',
              color: '#047857',
              fontWeight: 700,
              fontSize: 11,
              height: 22,
            }}
          />
        </Box>
      )}

      {/* Existing Timeline & Visits Component */}
      <PatientHistoryInlineView
        patient={patient}
        cardData={cardData}
        loading={loadingHistory}
        onOpenTab={(tabKey) => {
          if (tabKey === 'form1') onNavigateTab(0);
          else if (tabKey === 'form2') onNavigateTab(1);
          else if (tabKey === 'form3') onNavigateTab(2);
        }}
      />
    </Box>
  );
}

// ── Main Modal Component ─────────────────────────────────────────────────────

export default function BiteCaseDetailsModal({
  biteId,
  caseNumber,
  onClose,
}: BiteCaseDetailsModalProps) {
  const [data, setData] = useState<DetailsResponse | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState(0);

  // Patient History state
  const [fullPatient, setFullPatient] = useState<SavedRecord | null>(null);
  const [historyCardData, setHistoryCardData] = useState<SavedRecord | null>(null);
  const [episodes, setEpisodes] = useState<SavedRecord[]>([]);
  const [historySummary, setHistorySummary] = useState<SavedRecord | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(biteId);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  // 1. Fetch exact map-details for selected bite incident
  useEffect(() => {
    const controller = new AbortController();
    setError(false);

    api
      .get<DetailsResponse>(`/cases/${biteId}/map-details`, { signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) {
          if (Number(res.data.incident.bite_id) !== biteId) {
            throw new Error('Case incident mismatch');
          }
          setData(res.data);

          const patientId = Number(
            (res.data.patient as SavedRecord).patient_id || (res.data.incident as SavedRecord).patient_id
          );

          if (patientId) {
            // Load patient history in parallel
            setLoadingHistory(true);
            Promise.all([
              api.get<SavedRecord>(`/patients/${patientId}`).catch(() => null),
              api.get<{ episodes?: SavedRecord[]; summary?: SavedRecord }>(
                `/cases/patient/${patientId}/episodes`
              ).catch(() => null),
              api.get<SavedRecord>(
                `/tagoloan-treatment-cards/patient/${patientId}?bite_id=${biteId}`
              ).catch(() => null),
            ])
              .then(([patientRes, episodesRes, cardRes]) => {
                if (patientRes?.data) {
                  setFullPatient(patientRes.data);
                } else {
                  setFullPatient(res.data.patient);
                }

                if (episodesRes?.data) {
                  setEpisodes(episodesRes.data.episodes || []);
                  setHistorySummary(episodesRes.data.summary || null);
                }

                if (cardRes?.data) {
                  setHistoryCardData(cardRes.data);
                } else {
                  // Fallback: build cardData structure from map-details
                  setHistoryCardData({
                    bite_incident: res.data.incident,
                    consultation_history: res.data.assessments,
                    administered_doses: res.data.nurse_records,
                    schedules: res.data.schedules,
                    exposure_category: res.data.incident.exposure_category,
                    card: res.data.treatment_card,
                  });
                }
              })
              .finally(() => {
                setLoadingHistory(false);
              });
          }
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error('Failed to load bite map details:', err);
          setError(true);
        }
      });

    return () => controller.abort();
  }, [biteId]);

  // Handle switching episodes inside Patient History tab
  const handleSelectEpisode = (epBiteId: number) => {
    setSelectedEpisodeId(epBiteId);
    if (!data) return;
    const patientId = Number((data.patient as SavedRecord).patient_id || (data.incident as SavedRecord).patient_id);
    if (!patientId) return;

    setLoadingHistory(true);
    api
      .get<SavedRecord>(`/tagoloan-treatment-cards/patient/${patientId}?bite_id=${epBiteId}`)
      .then((res) => {
        if (res?.data) {
          setHistoryCardData(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoadingHistory(false);
      });
  };

  const handleTabChange = (_: React.SyntheticEvent, newTab: number) => {
    setTab(newTab);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  const patientName = data ? asDisplayValue(data.patient.name) : 'Patient Details';

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      aria-labelledby="bite-details-title"
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
          },
        },
        paper: {
          sx: {
            borderRadius: 3,
            height: '90vh',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
            fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          },
        },
      }}
    >
      {/* ── Fixed Header ── */}
      <DialogTitle
        id="bite-details-title"
        sx={{
          m: 0,
          px: 3,
          py: 2,
          bgcolor: 'var(--card-bg-solid, #ffffff)',
          borderBottom: '1px solid var(--border-glow, #e5e7eb)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: { xs: 16, sm: 18 },
                color: 'var(--text-h, #111827)',
                fontFamily: 'inherit',
              }}
            >
              {patientName}
            </Typography>
            <Chip
              label={caseNumber}
              size="small"
              sx={{
                bgcolor: 'rgba(16, 185, 129, 0.1)',
                color: '#059669',
                fontWeight: 700,
                fontFamily: 'monospace',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 1,
              }}
            />
          </Box>
          <Typography
            sx={{
              fontSize: 12,
              color: '#059669',
              fontWeight: 500,
              mt: 0.25,
              fontFamily: 'inherit',
            }}
          >
            Read-only patient information
          </Typography>
        </Box>
        <IconButton
          aria-label="Close patient details"
          onClick={onClose}
          sx={{
            color: 'var(--text-m, #6b7280)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.05)', color: 'var(--text-h, #111827)' },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      {/* ── Fixed 4-Tab Navigation Bar ── */}
      <Box sx={{ bgcolor: 'var(--card-bg-solid, #ffffff)', borderBottom: '1px solid var(--border-glow, #e5e7eb)', px: 2 }}>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Clinical form tabs"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: { xs: 13, sm: 14 },
              fontFamily: 'inherit',
              color: 'var(--text-m, #6b7280)',
              minHeight: 48,
              py: 1.5,
              px: { xs: 2, sm: 2.5 },
              '&.Mui-selected': {
                color: '#059669',
                fontWeight: 700,
              },
            },
            '& .MuiTabs-indicator': {
              bgcolor: '#059669',
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          {TABS.map((title, i) => (
            <Tab
              key={title}
              label={title}
              id={`bite-tab-${i}`}
              aria-controls={`bite-panel-${i}`}
            />
          ))}
        </Tabs>
      </Box>

      {/* ── Scrollable Dialog Content ── */}
      <DialogContent
        ref={contentRef}
        sx={{
          bgcolor: 'var(--bg-secondary, #f9fafb)',
          p: { xs: 2, sm: 3 },
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {error ? (
          <Alert severity="error" sx={{ my: 2 }}>
            Patient details could not be loaded. The record may be unavailable or you may not have permission to view it. Close and try again.
          </Alert>
        ) : !data ? (
          <Box role="status" sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#059669' }} />
            <Typography sx={{ mt: 2, fontSize: 13, color: 'var(--text-m, #6b7280)' }}>
              Loading clinical records…
            </Typography>
          </Box>
        ) : (
          <Box role="tabpanel" id={`bite-panel-${tab}`} aria-labelledby={`bite-tab-${tab}`}>
            {tab === 0 && (
              <Form1TabView
                patient={data.patient}
                incident={data.incident}
                consultation={data.assessments[0] || null}
              />
            )}
            {tab === 1 && (
              <Form2TabView
                incident={data.incident}
                assessments={data.assessments}
                plan={data.plan}
                intake={data.intake}
              />
            )}
            {tab === 2 && (
              <Form3TabView
                incident={data.incident}
                treatmentCard={data.treatment_card}
                nurseRecords={data.nurse_records}
                schedules={data.schedules}
              />
            )}
            {tab === 3 && (
              <PatientHistoryTabView
                selectedBiteId={biteId}
                patient={fullPatient || data.patient}
                cardData={historyCardData}
                episodes={episodes}
                historySummary={historySummary}
                loadingHistory={loadingHistory}
                onSelectEpisode={handleSelectEpisode}
                selectedEpisodeId={selectedEpisodeId}
                onNavigateTab={(idx) => {
                  setTab(idx);
                  if (contentRef.current) {
                    contentRef.current.scrollTop = 0;
                  }
                }}
              />
            )}
          </Box>
        )}
      </DialogContent>

      {/* ── Fixed Footer ── */}
      <DialogActions
        sx={{
          px: 3,
          py: 1.5,
          borderTop: '1px solid var(--border-glow, #e5e7eb)',
          bgcolor: 'var(--card-bg-solid, #ffffff)',
          justifyContent: 'flex-end',
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            color: '#047857',
            borderColor: '#059669',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: 13,
            px: 3,
            borderRadius: 1.5,
            '&:hover': {
              borderColor: '#047857',
              bgcolor: 'rgba(5, 150, 105, 0.05)',
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
