import { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Chip,
  IconButton,
} from '@mui/material';
import { HugeiconsIcon } from '@hugeicons/react';
import { PrinterIcon, Cancel01Icon, Share01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';

interface DohTransferSlipModalProps {
  open: boolean;
  onClose: () => void;
  patient: any;
  incident: any;
  treatmentRecords: any[];
  transferredToFacility?: string;
  transferReason?: string;
  transferDate?: string;
}

export function DohTransferSlipModal({
  open,
  onClose,
  patient,
  incident,
  treatmentRecords,
  transferredToFacility,
  transferReason,
  transferDate,
}: DohTransferSlipModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  if (!patient || !incident) return null;

  const administeredDoses = (treatmentRecords || []).filter(
    (r) => r.status === 'completed' || r.treatment_date || r.administered_at
  );

  const patientName = `${patient.last_name || ''}, ${patient.first_name || ''} ${patient.middle_name || ''}`.trim();
  const dob = patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const transferDt = transferDate ? new Date(transferDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      {/* Action Header - Screen Only */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          py: 1.5,
          px: 3,
          '@media print': { display: 'none' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <HugeiconsIcon icon={Share01Icon} size={20} color="#059669" />
          <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
            DOH Rabies PEP Referral & Transfer Certificate
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<HugeiconsIcon icon={PrinterIcon} size={16} />}
            onClick={handlePrint}
            sx={{ fontWeight: 600, textTransform: 'none', px: 2, borderRadius: 2 }}
          >
            Print Referral Slip
          </Button>
          <IconButton onClick={onClose} size="small" sx={{ color: '#64748b' }}>
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 4, bgcolor: '#ffffff' }} ref={printRef}>
        {/* Printable DOH Form Layout */}
        <Box
          sx={{
            border: '2px solid #0f172a',
            p: 3,
            borderRadius: 1,
            color: '#0f172a',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#475569' }}>
              Republic of the Philippines • Department of Health
            </Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: '#059669', mt: 0.5 }}>
              MUNICIPAL HEALTH OFFICE — ANIMAL BITE TREATMENT CENTER (ABTC)
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#64748b' }}>
              Tagoloan, Misamis Oriental • Contact: (088) 567-1234
            </Typography>
            <Box sx={{ my: 1.5, height: 2, bgcolor: '#059669' }} />
            <Typography sx={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              PATIENT CLINICAL TRANSFER & REFERRAL SLIP
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
              (Post-Exposure Prophylaxis Regimen Continuity)
            </Typography>
          </Box>

          {/* Transfer Context Banner */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 1.5,
              mb: 2.5,
              bgcolor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 1.5,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>
                Referred / Transferred To Facility:
              </Typography>
              <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#047857' }}>
                🏥 {transferredToFacility || incident.transferred_to_facility || 'Receiving ABTC / Hospital'}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#065f46' }}>
                Transfer Date: <strong>{transferDt}</strong>
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#047857' }}>
                Reason: {transferReason || incident.transfer_reason || 'Patient Relocation / Continuity'}
              </Typography>
            </Box>
          </Box>

          {/* Patient Demographics Table */}
          <Box sx={{ mb: 2.5, border: '1px solid #cbd5e1', borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f1f5f9', px: 1.5, py: 0.75, borderBottom: '1px solid #cbd5e1' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#334155' }}>
                I. Patient Demographics & Exposure Summary
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, fontSize: 12 }}>
              <div>
                <span style={{ color: '#64748b', fontSize: 11 }}>Patient Name:</span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{patientName}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: 11 }}>Age / Gender:</span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{patient.age || '—'} yrs • {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : '—'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: 11 }}>Date of Birth:</span>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{dob}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: 11 }}>Address:</span>
                <div style={{ fontWeight: 500, color: '#0f172a' }}>{patient.address || 'Tagoloan, Misamis Oriental'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: 11 }}>Master Case Number:</span>
                <div style={{ fontWeight: 700, color: '#059669' }}>{incident.case_number || 'BC-2026-0001'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: 11 }}>Exposure Category:</span>
                <div style={{ fontWeight: 800, color: '#dc2626' }}>
                  Category {incident.severity === 'severe' ? 'III' : incident.severity === 'minor' ? 'I' : 'II'} ({incident.exposure_type || 'Bite'})
                </div>
              </div>
            </Box>
          </Box>

          {/* Administered Doses Table */}
          <Box sx={{ mb: 2.5, border: '1px solid #cbd5e1', borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f1f5f9', px: 1.5, py: 0.75, borderBottom: '1px solid #cbd5e1' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#334155' }}>
                II. Rabies Vaccination Administered (Historical Record)
              </Typography>
            </Box>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700 }}>Dose Period</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700 }}>Date Given</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700 }}>Vaccine Brand</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700 }}>Route</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700 }}>Batch / Lot #</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700 }}>Administered By / Facility</th>
                </tr>
              </thead>
              <tbody>
                {administeredDoses.length > 0 ? (
                  administeredDoses.map((d, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 700, color: '#059669' }}>
                        Dose {d.dose_number !== undefined ? (d.dose_number === 0 ? 'Day 0' : `Day ${d.dose_number}`) : 'Administered'}
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: 600 }}>
                        {d.treatment_date ? new Date(d.treatment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: 600 }}>{d.vaccine_brand || d.vaccine_generic || 'Speeda / PVRV'}</td>
                      <td style={{ padding: '6px 10px' }}>{d.route || 'ID / IM'}</td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>{d.batch_no || '—'}</td>
                      <td style={{ padding: '6px 10px', color: '#334155' }}>
                        {d.is_external ? `Transferred-in (${d.external_facility_name || 'External Facility'})` : 'Tagoloan ABTC'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                      No doses recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Box>

          {/* Instructions for Receiving Clinic */}
          <Box sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1.5, mb: 3 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', mb: 0.5 }}>
              Instructions to Receiving Health Facility:
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: '#475569', lineHeight: 1.5 }}>
              1. Please inspect the patient's bite wound and verify adherence to the prescribed rabies PEP timeline above.<br />
              2. Complete the remaining scheduled follow-up doses (e.g. Day 3, Day 7, Day 28) using authorized WHO/DOH pre-qualified cell-culture rabies vaccine (CCV).<br />
              3. For queries or electronic record verification, contact Tagoloan ABTC at (088) 567-1234.
            </Typography>
          </Box>

          {/* Signature Block */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pt: 3, borderTop: '1px dashed #cbd5e1' }}>
            <Box sx={{ textAlign: 'center', width: 220 }}>
              <Box sx={{ borderBottom: '1px solid #0f172a', pb: 0.5, mb: 0.5, minHeight: 24 }} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>
                Attending Nurse / Health Worker
              </Typography>
              <Typography sx={{ fontSize: 10, color: '#64748b' }}>License / Signature Over Printed Name</Typography>
            </Box>

            <Box sx={{ textAlign: 'center', width: 220 }}>
              <Box sx={{ borderBottom: '1px solid #0f172a', pb: 0.5, mb: 0.5, minHeight: 24 }} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>
                Municipal Health Officer (MHO)
              </Typography>
              <Typography sx={{ fontSize: 10, color: '#64748b' }}>ABTC Supervising Physician</Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', '@media print': { display: 'none' } }}>
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none', fontWeight: 600, color: '#64748b' }}>
          Close
        </Button>
        <Button
          onClick={handlePrint}
          variant="contained"
          color="success"
          startIcon={<HugeiconsIcon icon={PrinterIcon} size={16} />}
          sx={{ textTransform: 'none', fontWeight: 700, px: 3 }}
        >
          Print Official Slip
        </Button>
      </DialogActions>
    </Dialog>
  );
}
export default DohTransferSlipModal;
