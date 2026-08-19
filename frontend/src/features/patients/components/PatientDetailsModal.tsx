import { useState } from 'react';
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
import { Icon } from '../../../shared/components/ui/Icon';
import type { Patient } from '../types';

interface PatientDetailsModalProps {
  open: boolean;
  patient: Patient | null;
  onClose: () => void;
  onEdit: (patient: Patient) => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(val: string | undefined | null, fallback = '—') {
  if (!val || val.trim() === '') return fallback;
  return val;
}

function fmtDate(val: string | undefined | null) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function fmtLabel(val: string | undefined | null): string {
  if (!val) return '—';
  return val
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ── read-only field ───────────────────────────────────────────────────────────

function ROField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span style={{
        fontSize: 13.5,
        fontWeight: 500,
        color: value && value !== '—' ? '#111827' : '#d1d5db',
        fontFamily: 'inherit',
      }}>
        {fmt(value)}
      </span>
    </div>
  );
}

// ── section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{
        margin: '0 0 10px 0',
        fontSize: 11,
        fontWeight: 700,
        color: '#0d9488',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        borderBottom: '1px solid #ccfbf1',
        paddingBottom: 6,
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}

// ── grid ─────────────────────────────────────────────────────────────────────

function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: '10px 14px',
    }}>
      {children}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function PatientDetailsModal({
  open,
  patient,
  onClose,
  onEdit,
}: PatientDetailsModalProps) {
  const [printing, setPrinting] = useState(false);

  if (!patient) return null;

  const p = patient as any; // extended fields not in base type
  const d = p.details || {}; // patient_details relationship

  const handleDirectPrint = async () => {
    if (!patient || printing) return;
    setPrinting(true);

    try {
      const token = localStorage.getItem('authToken') || '';
      const patientId = patient.patient_id || patient.id;
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      const printUrl = `${API_BASE}/print/patient/${patientId}/enrolment?token=${token}`;

      const res = await fetch(printUrl, {
        headers: {
          Accept: 'text/html',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Print failed (HTTP ${res.status})`);
      }

      const html = await res.text();

      // Create a hidden offscreen iframe for direct printing without preview or leaving page
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';

      document.body.appendChild(iframe);

      iframe.srcdoc = html;

      iframe.onload = () => {
        setTimeout(() => {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            setPrinting(false);
          }, 1000);
        }, 350);
      };
    } catch (err) {
      console.error('Direct print error:', err);
      setPrinting(false);
    }
  };

  // Helper to get government program details
  const getGovProgramInfo = () => {
    if (details.has_membership !== 'yes') return null;

    if (details.philhealth_member === 'yes') {
      return {
        name: 'PhilHealth',
        fields: [
          { label: 'Status Type', value: details.philhealth_status },
          { label: 'PhilHealth No.', value: details.philhealth_no },
          { label: 'Category', value: details.philhealth_category },
        ],
      };
    }
    if (details.fourps_member === 'yes') {
      const fields = [
        { label: '4Ps Membership Category', value: details.fourps_category },
      ];
      if (details.fourps_category === 'Member of Beneficiary') {
        fields.push({ label: 'Registered 4Ps Beneficiary', value: details.registered_fourps_beneficiary });
        fields.push({ label: 'Relationship to Registered Beneficiary', value: details.fourps_relationship });
      }
      return { name: '4Ps (Pantawid Pamilyang Pilipino Program)', fields };
    }
    if (details.dswd_nhts === 'yes') {
      return { name: 'DSWD NHTS', fields: [] };
    }
    
    // Other memberships
    const otherType = details.other_membership;
    if (otherType && otherType !== 'none') {
      let programName = '';
      let idLabel = 'ID / Certificate No.';
      
      if (otherType === 'senior_citizen') {
        programName = 'Senior Citizen';
        idLabel = 'Senior Citizen ID No.';
      } else if (otherType === 'pwd') {
        programName = 'PWD (Person with Disability)';
        idLabel = 'PWD ID No.';
      } else if (otherType === 'indigenous_member') {
        programName = 'Indigenous Member';
        idLabel = 'Tribe / IP ID No.';
      } else if (otherType === 'others') {
        programName = details.other_membership_name || 'Others';
      }

      return {
        name: programName,
        fields: [
          { label: idLabel, value: details.other_membership_no },
        ],
      };
    }

    return null;
  };

  const govProgram = getGovProgramInfo();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      {/* ── Title ── */}
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        pb: 1.5,
        borderBottom: '1px solid #e5e7eb',
        bgcolor: '#fafafa',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon name="patients" size={20} color="#3b82f6" />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#173d29', fontSize: 16, fontFamily: 'inherit' }}>
            Patient Information
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#9ca3af', fontFamily: 'inherit' }}>
            — Form 1 · Patient Enrolment (Read-only)
          </Typography>
        </Box>
        <Chip
          label={`#${patient.patient_number || patient.patient_id}`}
          size="small"
          sx={{ bgcolor: '#f3f4f6', color: '#374151', fontWeight: 700, fontFamily: 'monospace' }}
        />
      </DialogTitle>

      {/* ── Content ── */}
      <DialogContent sx={{ pt: 2.5, pb: 2, fontFamily: 'inherit' }}>

        {/* I. Patient Information */}
        <Section title="I. Patient Information">
          <Grid cols={4}>
            <ROField label="Last Name"   value={patient.last_name} />
            <ROField label="First Name"  value={patient.first_name} />
            <ROField label="Middle Name" value={patient.middle_name} />
            <ROField label="Suffix"      value={p.suffix} />
          </Grid>
          <div style={{ height: 10 }} />
          <Grid cols={3}>
            <ROField label="Sex (Kasarian)"  value={fmtLabel(patient.gender || p.sex)} />
            <ROField label="Date of Birth"   value={fmtDate(patient.date_of_birth)} />
            <ROField label="Blood Type"      value={d.blood_type} />
          </Grid>
          <div style={{ height: 10 }} />
          <Grid cols={2}>
            <ROField label="Mother's Maiden Name" value={d.mother_maiden_name} />
            <ROField label="Civil Status"          value={fmtLabel(d.civil_status)} />
          </Grid>
          {d.civil_status === 'married' && (
            <>
              <div style={{ height: 10 }} />
              <Grid cols={1}>
                <ROField label="Spouse's Name" value={d.spouse_name} />
              </Grid>
            </>
          )}
        </Section>

        {/* II. Residential Address */}
        <Section title="Residential Address — Misamis Oriental (Tirahan)">
          <ROField label="Full Address" value={patient.address} />
        </Section>

        {/* III. Contact Information */}
        <Section title="Contact Information">
          <Grid cols={2}>
            <ROField label="Contact Number (Mobile)"  value={patient.contact_number || p.phone} />
            <ROField label="Email Address"             value={patient.email} />
          </Grid>
          <div style={{ height: 10 }} />
          <Grid cols={2}>
            <ROField label="Emergency Contact Name"  value={p.emergency_contact_name} />
            <ROField label="Emergency Contact Phone" value={p.emergency_contact_number || p.emergency_contact_phone} />
          </Grid>
        </Section>

        {/* IV. Socioeconomic Information */}
        <Section title="Socioeconomic Information">
          <Grid cols={3}>
            <ROField label="Educational Attainment"  value={fmtLabel(d.educational_attainment)} />
            <ROField label="Employment Status"        value={fmtLabel(d.employment_status)} />
            <ROField label="Family Member Position"   value={fmtLabel(d.family_member)} />
          </Grid>
        </Section>

        {/* V. Government Program Information */}
        <Section title="II. Government Program Information">
          <Grid cols={2}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ROField label="PhilHealth Member?"   value={fmtLabel(d.philhealth_member)} />
              {d.philhealth_member === 'yes' && (
                <>
                  <ROField label="Status Type"    value={fmtLabel(d.philhealth_status)} />
                  <ROField label="PhilHealth No." value={d.philhealth_no} />
                  <ROField label="Category"       value={fmtLabel(d.philhealth_category)} />
                </>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ROField label="4Ps Member?" value={fmtLabel(d.fourps_member)} />
              <ROField label="DSWD NHTS?"  value={fmtLabel(d.dswd_nhts)} />
            </div>
          </Grid>
        </Section>

        {/* Registration meta */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 12px',
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          fontSize: 12,
          color: '#6b7280',
        }}>
          <span>Registered On: <strong style={{ color: '#374151' }}>{fmtDate(patient.created_at)}</strong></span>
          <span>·</span>
          <span>Status:&nbsp;
            <Chip
              size="small"
              label={(patient.status || 'Active').toUpperCase()}
              sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700, fontSize: 10, height: 20 }}
            />
          </span>
        </div>
      </DialogContent>

      {/* ── Footer ── */}
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e5e7eb', bgcolor: '#fafafa', justifyContent: 'flex-end', gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleDirectPrint}
          disabled={printing}
          startIcon={
            printing ? (
              <CircularProgress size={14} sx={{ color: '#059669' }} />
            ) : (
              <Icon name="print" size={16} color="#059669" />
            )
          }
          sx={{
            borderColor: '#059669',
            color: '#059669',
            fontWeight: 600,
            fontSize: 13,
            textTransform: 'none',
            fontFamily: 'inherit',
            '&:hover': { bgcolor: '#f0fdf4', borderColor: '#047857' },
          }}
        >
          {printing ? 'Opening Printer…' : 'Print Form 1 (Enrolment)'}
        </Button>
        <Button onClick={onClose} sx={{ color: '#6b7280', textTransform: 'none', fontWeight: 600, fontFamily: 'inherit' }}>
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
