import { useEffect, useMemo, useState } from 'react';

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Vaccines as VaccineIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  AcUnit as ColdChainIcon,
  Medication as RegimenIcon,
  AddShoppingCart as AddStockIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import { getVaccinePresets, deleteVaccinePreset } from '../../services/vaccineInventoryService';
import VaccineTypeDialog from '../VaccineTypeDialog/VaccineTypeDialog';
import ConfirmationDialog from '../../../../components/feedback/ConfirmationDialog';
import type { VaccineTypePreset } from '../../types';

interface VaccineTypesCatalogProps {
  onStockBatch?: (vaccineType: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'Anti-Rabies Vaccines (ARV)': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Rabies Immunoglobulins (RIG)': { bg: '#ecfeff', color: '#0f766e', border: '#a5f3fc' },
  'Tetanus & Toxoids': { bg: '#fff7ed', color: '#c2410c', border: '#fdba74' },
  'Other Biologicals': { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
};

export default function VaccineTypesCatalog({ onStockBatch }: VaccineTypesCatalogProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();

  const [presets, setPresets] = useState<VaccineTypePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<VaccineTypePreset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VaccineTypePreset | null>(null);
  const [alert, setAlert] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [successModal, setSuccessModal] = useState<{ open: boolean; title: string; message: string } | null>(null);

  const loadPresets = async () => {
    setLoading(true);
    try {
      const data = await getVaccinePresets();
      setPresets(data || []);
    } catch {
      setPresets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPresets();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const filteredPresets = useMemo(() => {
    return presets.filter((preset) => {
      const matchSearch = preset.vaccine_name.toLowerCase().includes(search.toLowerCase())
        || (preset.category || '').toLowerCase().includes(search.toLowerCase());
      const matchCategory = !categoryFilter || preset.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [categoryFilter, presets, search]);

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;

    try {
      await deleteVaccinePreset(deleteTarget.id);
      const name = deleteTarget.vaccine_name;
      setSuccessModal({
        open: true,
        title: 'Vaccine Type Deleted',
        message: `Vaccine type "${name}" has been removed from the catalog.`,
      });
      loadPresets();
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setAlert({ message: apiError.response?.data?.message || 'Failed to delete vaccine type.', severity: 'error' });
    } finally {
      setDeleteTarget(null);
    }
  };


  return (
    <Box>
      {alert && (
        <Alert severity={alert.severity} onClose={() => setAlert(null)} sx={{ mb: 2.5, borderRadius: 2 }}>
          {alert.message}
        </Alert>
      )}

      {/* ── Single Unified Header ── */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-h, #0f172a)', fontSize: '1.45rem', letterSpacing: '-0.3px' }}>
              Vaccine Type Catalog
            </Typography>
            <Chip
              label={`${presets.length} Profile${presets.length === 1 ? '' : 's'}`}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: 12,
                bgcolor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
              }}
            />
          </Box>
          <Typography sx={{ fontSize: 13, color: 'var(--text-secondary, #64748b)', mt: 0.5, maxWidth: 720 }}>
            Configure master vaccine definitions, default shelf-life durations, open-vial discard rules, and clinical regimens.
          </Typography>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '13px' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Dashboard
            </button>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Vaccine Type Setup</span>
          </div>
        </Box>

        <Tooltip title={isAdmin ? 'Add a new vaccine profile to the catalog' : 'Admin only'}>
          <span>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                if (!isAdmin) return;
                setSelectedPreset(null);
                setDialogOpen(true);
              }}
              disabled={!isAdmin}
              sx={{
                bgcolor: '#059669',
                '&:hover': { bgcolor: '#047857' },
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 13.5,
                borderRadius: 2,
                px: 2.5,
                py: 1,
                boxShadow: '0 2px 8px rgba(5,150,105,0.25)',
              }}
            >
              Add Vaccine Type
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* ── Search & Filter Controls ── */}
      <Paper elevation={0} sx={{ p: 1.75, mb: 3, border: '1px solid var(--card-border, #e2e8f0)', borderRadius: 2.5, bgcolor: 'var(--card-bg, #fff)' }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by vaccine brand or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Select
              fullWidth
              size="small"
              displayEmpty
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              sx={{ borderRadius: 2, bgcolor: '#f8fafc' }}
            >
              <MenuItem value="">All Categories</MenuItem>
              <MenuItem value="Anti-Rabies Vaccines (ARV)">Anti-Rabies Vaccines (ARV)</MenuItem>
              <MenuItem value="Rabies Immunoglobulins (RIG)">Rabies Immunoglobulins (RIG)</MenuItem>
              <MenuItem value="Tetanus & Toxoids">Tetanus &amp; Toxoids</MenuItem>
              <MenuItem value="Other Biologicals">Other Biologicals</MenuItem>
            </Select>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
            {(search || categoryFilter) && (
              <Button size="small" onClick={() => { setSearch(''); setCategoryFilter(''); }} sx={{ color: '#059669', textTransform: 'none', fontWeight: 600, fontSize: 13 }}>
                Reset Filters
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* ── Content Area ── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={36} sx={{ color: '#059669' }} />
        </Box>
      ) : filteredPresets.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: '1px solid var(--card-border, #e2e8f0)', borderRadius: 3 }}>
          <VaccineIcon sx={{ fontSize: 44, color: '#94a3b8', mb: 1.5 }} />
          <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#334155' }}>
            No vaccine types found
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#64748b', mt: 0.5, mb: 2 }}>
            {search || categoryFilter ? 'No saved type matches the current search filters.' : 'Register your first master vaccine profile.'}
          </Typography>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setSelectedPreset(null);
                setDialogOpen(true);
              }}
              sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Add Vaccine Type
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {filteredPresets.map((preset) => {
            const categoryStyle = CATEGORY_COLORS[preset.category || ''] || { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' };

            return (
              <Grid size={{ xs: 12, md: 6, xl: 4 }} key={preset.id || preset.vaccine_name}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid #e2e8f0',
                    borderRadius: 3,
                    bgcolor: '#ffffff',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                      borderColor: '#a7f3d0',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {/* Top Row: Category chip & Action icons */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
                      <Chip
                        label={preset.category || 'General'}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: 11.5,
                          bgcolor: categoryStyle.bg,
                          color: categoryStyle.color,
                          border: `1px solid ${categoryStyle.border}`,
                        }}
                      />
                      {isAdmin && (
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Edit Profile">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedPreset(preset);
                                setDialogOpen(true);
                              }}
                              sx={{ color: '#64748b', '&:hover': { color: '#059669', bgcolor: '#f0fdf4' } }}
                            >
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Profile">
                            <IconButton
                              size="small"
                              onClick={() => setDeleteTarget(preset)}
                              sx={{ color: '#64748b', '&:hover': { color: '#dc2626', bgcolor: '#fef2f2' } }}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </Box>

                    {/* Vaccine Name */}
                    <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#0f172a', lineHeight: 1.3, mb: 1.5 }}>
                      {preset.vaccine_name}
                    </Typography>

                    {/* Structured Rules List */}
                    <Stack spacing={1.25} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <CalendarIcon sx={{ fontSize: 16, color: '#059669', mt: 0.2 }} />
                        <Box>
                          <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Default Shelf-Life
                          </Typography>
                          <Typography sx={{ fontSize: 13, color: '#1f2937', fontWeight: 600 }}>
                            {preset.default_shelf_life_months} months from manufacture
                          </Typography>
                        </Box>
                      </Box>

                      {preset.default_open_vial_hours ? (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <TimeIcon sx={{ fontSize: 16, color: '#d97706', mt: 0.2 }} />
                          <Box>
                            <Typography sx={{ fontSize: 11, color: '#92400e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                              Open-Vial Discard Rule
                            </Typography>
                            <Typography sx={{ fontSize: 12.5, color: '#92400e', fontWeight: 700, bgcolor: '#fffbeb', px: 1, py: 0.25, borderRadius: 1, border: '1px solid #fde68a', display: 'inline-block', mt: 0.25 }}>
                              Discard after {preset.default_open_vial_hours} hours
                            </Typography>
                          </Box>
                        </Box>
                      ) : null}

                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <RegimenIcon sx={{ fontSize: 16, color: '#0284c7', mt: 0.2 }} />
                        <Box>
                          <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Administration &amp; Dosing
                          </Typography>
                          <Typography sx={{ fontSize: 13, color: '#1f2937', fontWeight: 600 }}>
                            {preset.administration_route || 'Intradermal (ID) / Intramuscular (IM)'}
                            {preset.regimen_units_per_patient ? ` • ${preset.regimen_units_per_patient} dose(s)/regimen` : ''}
                          </Typography>
                          {preset.dosing_regimen_notes && (
                            <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.35, lineHeight: 1.4 }}>
                              {preset.dosing_regimen_notes}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <ColdChainIcon sx={{ fontSize: 16, color: '#6b7280', mt: 0.2 }} />
                        <Box>
                          <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Cold-Chain Storage
                          </Typography>
                          <Typography sx={{ fontSize: 12.5, color: '#374151', lineHeight: 1.4 }}>
                            {preset.storage_temperature_notes || 'Stored at +2°C to +8°C.'}
                          </Typography>
                        </Box>
                      </Box>
                    </Stack>

                    {/* Card Footer: Stock stats and Add batch shortcut */}
                    <Box sx={{ mt: 'auto', pt: 1.75, borderTop: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: 12, color: '#475569', fontWeight: 700 }}>
                        {preset.active_batches_count || 0} active batch{preset.active_batches_count === 1 ? '' : 'es'} • {preset.total_stock || 0} units
                      </Typography>

                      {onStockBatch && (
                        <Button
                          size="small"
                          startIcon={<AddStockIcon sx={{ fontSize: 14 }} />}
                          onClick={() => onStockBatch(preset.vaccine_name)}
                          sx={{ textTransform: 'none', fontSize: 12, fontWeight: 700, color: '#059669', '&:hover': { bgcolor: '#ecfdf5' } }}
                        >
                          Add Stock Batch
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* ── Dialogs ── */}
      <VaccineTypeDialog
        open={dialogOpen}
        preset={selectedPreset}
        onClose={() => setDialogOpen(false)}
        onSaved={(saved) => {
          setSuccessModal({
            open: true,
            title: selectedPreset ? 'Vaccine Type Updated' : 'Vaccine Type Created',
            message: `Vaccine type "${saved.vaccine_name}" has been saved successfully.`,
          });
          loadPresets();
        }}
      />

      {deleteTarget && (
        <ConfirmationDialog
          variant="danger"
          colorVariant="danger"
          title="Delete Vaccine Type"
          message={`Remove "${deleteTarget.vaccine_name}" from the catalog? Existing batch inventory records will remain intact, but staff will no longer be able to select this profile for new batches.`}
          confirmLabel="Delete Profile"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Success Modal */}
      {successModal && (
        <ConfirmationDialog
          variant="success"
          title={successModal.title}
          message={successModal.message}
          confirmLabel="OK"
          hideCancel
          onConfirm={() => setSuccessModal(null)}
        />
      )}
    </Box>
  );
}

