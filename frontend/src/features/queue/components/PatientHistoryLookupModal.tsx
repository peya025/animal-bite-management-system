import { useState, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  Calendar03Icon,
  Stethoscope02Icon,
  User02Icon,
  Clock01Icon,
  EyeIcon,
  Medicine01Icon,
  Pulse01Icon,
} from '@hugeicons/core-free-icons';
import api from '../../../shared/services/api';

interface PatientHistoryLookupModalProps {
  open: boolean;
  onClose: () => void;
}

interface PatientResult {
  patient_id: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  age: number;
  gender: string;
  contact_number?: string;
  latest_consultation_record?: {
    consultation_date?: string;
    diagnosis?: string;
    chief_complaints?: string;
    prescribed_vaccine_type?: string;
    treatment_id?: number;
  };
}

interface TreatmentDetail {
  treatment_id: number;
  consultation_date?: string;
  consultation_time?: string;
  chief_complaints?: string;
  diagnosis?: string;
  medication_treatment?: string;
  prescribed_vaccine_type?: string;
  provider_name?: string;
  attending_provider?: string;
  blood_pressure?: string;
  temperature?: string;
  weight?: string;
  nature_of_visit?: string;
  created_at?: string;
}

export function PatientHistoryLookupModal({ open, onClose }: PatientHistoryLookupModalProps) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [treatments, setTreatments] = useState<TreatmentDetail[]>([]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setResults([]);
      setSelectedPatient(null);
      setTreatments([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!search.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/doctor/patients', {
          params: { tab: 'all', search: search.trim(), per_page: 20 },
        });
        setResults(res.data?.data || []);
      } catch (err) {
        console.error('Failed to lookup patient history:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, open]);

  const handleSelectPatient = async (patient: PatientResult) => {
    setSelectedPatient(patient);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/treatment-records/patient/${patient.patient_id}`);
      setTreatments(res.data?.treatments || (res.data?.latest_treatment ? [res.data.latest_treatment] : []));
    } catch (err) {
      console.error('Failed to load consultation history:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const parseText = (val: unknown): string => {
    if (!val) return '—';
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.join(', ');
      } catch {
        // use raw string
      }
      return val;
    }
    return String(val);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2.5, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HugeiconsIcon icon={Clock01Icon} size={20} strokeWidth={2.2} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 16, color: 'var(--text-h)' }}>
              Consultation History Lookup
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Search returning patients to inspect previous Form 2 consultations and clinical notes
            </Typography>
          </Box>
        </Box>
        <Tooltip title="Close">
          <IconButton size="small" onClick={onClose} sx={{ color: 'var(--text-secondary)' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Search Input Bar */}
      <Box sx={{ p: 2, bgcolor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <TextField
          fullWidth
          size="small"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patient name, ID, or case number…"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />
                </InputAdornment>
              ),
              endAdornment: loading ? <CircularProgress size={16} sx={{ color: 'var(--primary)' }} /> : null,
              sx: {
                bgcolor: 'var(--card-bg)',
                borderRadius: 2,
                fontSize: 13.5,
              },
            },
          }}
        />
      </Box>

      {/* Content Area */}
      <DialogContent sx={{ p: 2.5, flex: 1, overflowY: 'auto' }}>
        {!selectedPatient ? (
          // List of Search Results
          <Box>
            {!search.trim() ? (
              <Box sx={{ textAlign: 'center', py: 6, color: 'var(--text-secondary)' }}>
                <HugeiconsIcon icon={User02Icon} size={36} strokeWidth={1.5} />
                <Typography sx={{ mt: 1, fontSize: 13, fontWeight: 500 }}>
                  Enter a patient name above to view historical consultations
                </Typography>
              </Box>
            ) : loading ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress size={28} />
                <Typography sx={{ mt: 1, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  Searching patients…
                </Typography>
              </Box>
            ) : results.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, color: 'var(--text-secondary)' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                  No matching patients found
                </Typography>
                <Typography sx={{ fontSize: 12, mt: 0.5 }}>
                  Try another name or verify the spelling
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1}>
                {results.map((p) => {
                  const fullName = `${p.first_name} ${p.middle_name || ''} ${p.last_name}`.trim();
                  const rec = p.latest_consultation_record;
                  return (
                    <Paper
                      key={p.patient_id}
                      elevation={0}
                      onClick={() => handleSelectPatient(p)}
                      sx={{
                        p: 1.75,
                        border: '1px solid var(--border)',
                        borderRadius: 2,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          borderColor: '#10b981',
                          bgcolor: 'rgba(16, 185, 129, 0.04)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <HugeiconsIcon icon={User02Icon} size={16} strokeWidth={2} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-h)' }}>
                            {fullName}
                          </Typography>
                          <Typography sx={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                            {p.age}y · {p.gender} {p.contact_number ? `· ${p.contact_number}` : ''}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ textAlign: 'right' }}>
                        {rec?.consultation_date ? (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.25, bgcolor: '#ecfdf5', color: '#059669', borderRadius: 1, fontSize: 11, fontWeight: 600 }}>
                            <HugeiconsIcon icon={Calendar03Icon} size={11} strokeWidth={2} />
                            Last: {rec.consultation_date}
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            No prior consultation
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mt: 0.5, color: '#10b981', fontSize: 11.5, fontWeight: 600 }}>
                          <span>View History</span>
                          <HugeiconsIcon icon={EyeIcon} size={13} strokeWidth={2.2} />
                        </Box>
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Box>
        ) : (
          // Details View for Selected Patient
          <Box>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#059669',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    marginBottom: 4,
                  }}
                >
                  ← Back to search results
                </button>
                <Typography sx={{ fontWeight: 700, fontSize: 15, color: 'var(--text-h)' }}>
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Patient #{selectedPatient.patient_id} · {selectedPatient.age} years old · {selectedPatient.gender}
                </Typography>
              </Box>
            </Box>

            {loadingDetails ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress size={28} />
                <Typography sx={{ mt: 1, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  Loading consultation records…
                </Typography>
              </Box>
            ) : treatments.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, color: 'var(--text-secondary)' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                  No prior consultation records found for this patient
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {treatments.map((t, idx) => (
                  <Paper
                    key={t.treatment_id || idx}
                    elevation={0}
                    sx={{
                      p: 2,
                      border: '1px solid var(--border)',
                      borderRadius: 2.5,
                      bgcolor: 'var(--card-bg)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, pb: 1, borderBottom: '1px solid var(--border)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <HugeiconsIcon icon={Calendar03Icon} size={14} strokeWidth={2} />
                        </Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-h)' }}>
                          Consultation on {t.consultation_date || 'Date not recorded'}
                        </Typography>
                        {t.consultation_time && (
                          <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            ({t.consultation_time})
                          </Typography>
                        )}
                      </Box>
                      {t.provider_name && (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.2, bgcolor: '#f0fdf4', color: '#166534', borderRadius: 1, fontSize: 11, fontWeight: 600 }}>
                          <HugeiconsIcon icon={Stethoscope02Icon} size={12} strokeWidth={2} />
                          Dr. {t.provider_name}
                        </Box>
                      )}
                    </Box>

                    {/* Vitals summary */}
                    {(t.blood_pressure || t.temperature || t.weight) && (
                      <Box sx={{ display: 'flex', gap: 2, mb: 1.5, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--text-secondary)' }}>
                        {t.blood_pressure && <span>BP: <strong>{t.blood_pressure}</strong></span>}
                        {t.temperature && <span>Temp: <strong>{t.temperature}°C</strong></span>}
                        {t.weight && <span>Weight: <strong>{t.weight} kg</strong></span>}
                      </Box>
                    )}

                    {/* Chief complaints */}
                    <Box sx={{ mb: 1 }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        Chief Complaints
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: 'var(--text)', mt: 0.2 }}>
                        {t.chief_complaints || '—'}
                      </Typography>
                    </Box>

                    {/* Diagnoses */}
                    <Box sx={{ mb: 1 }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        Diagnosis
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: '#065f46', fontWeight: 500, mt: 0.2 }}>
                        {parseText(t.diagnosis)}
                      </Typography>
                    </Box>

                    {/* Prescribed Vaccine & Medication */}
                    {(t.prescribed_vaccine_type || t.medication_treatment) && (
                      <Box sx={{ mt: 1.5, p: 1.25, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                        {t.prescribed_vaccine_type && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                            <HugeiconsIcon icon={Pulse01Icon} size={13} strokeWidth={2} />
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                              Prescribed PEP: {t.prescribed_vaccine_type}
                            </Typography>
                          </Box>
                        )}
                        {t.medication_treatment && (
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                            <HugeiconsIcon icon={Medicine01Icon} size={13} strokeWidth={2} />
                            <Typography sx={{ fontSize: 12, color: '#334155' }}>
                              {parseText(t.medication_treatment)}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PatientHistoryLookupModal;
