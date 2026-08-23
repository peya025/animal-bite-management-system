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
  Settings as SetupIcon,
} from '@mui/icons-material';
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

  const [presets, setPresets] = useState<VaccineTypePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<VaccineTypePreset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VaccineTypePreset | null>(null);
  const [alert, setAlert] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

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
      setAlert({ message: `Vaccine type "${deleteTarget.vaccine_name}" deleted successfully.`, severity: 'success' });
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
        <Alert severity={alert.severity} onClose={() => setAlert(null)} sx={{ mb: 2.5 }}>
          {alert.message}
        </Alert>
      )}

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '1.15rem' }}>
              Vaccine Type Setup
            </Typography>
            <Chip
              icon={<SetupIcon style={{ fontSize: 14 }} />}
              label="Setup mode"
              size="small"
              sx={{ fontWeight: 800, bgcolor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
            />
            <Chip label={`${presets.length} saved type${presets.length === 1 ? '' : 's'}`} size="small" sx={{ fontWeight: 700, bgcolor: '#f8fafc', color: '#475569' }} />
          </Box>
          <Typography sx={{ fontSize: 13, color: '#64748b', mt: 0.35, maxWidth: 760 }}>
            Define reusable vaccine rules here once, then reuse them every day from Add Stock. This screen is intentionally styled differently to signal configuration rather than daily operations.
          </Typography>
        </Box>

        <Tooltip title={isAdmin ? 'Add a vaccine type to the separate setup catalog' : 'Admin only'}>
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
                bgcolor: '#2563eb',
                '&:hover': { bgcolor: '#1d4ed8' },
                textTransform: 'none',
                fontWeight: 800,
                borderRadius: 2,
                px: 2.5,
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
              }}
            >
              Add New Type
            </Button>
          </span>
        </Tooltip>
      </Box>

      <Alert severity="info" icon={<SetupIcon fontSize="inherit" />} sx={{ mb: 3, border: '1px solid #dbeafe', bgcolor: '#f8fbff' }}>
        Save the rule once here: vaccine name, shelf-life, open-vial discard duration, units per patient regimen, and storage notes. The Add Stock form will pull these rules as read-only guidance.
      </Alert>

      <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #dbeafe', borderRadius: 2.5, bgcolor: '#fff' }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search vaccine type or category"
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
              <MenuItem value="">All categories</MenuItem>
              <MenuItem value="Anti-Rabies Vaccines (ARV)">Anti-Rabies Vaccines (ARV)</MenuItem>
              <MenuItem value="Rabies Immunoglobulins (RIG)">Rabies Immunoglobulins (RIG)</MenuItem>
              <MenuItem value="Tetanus & Toxoids">Tetanus &amp; Toxoids</MenuItem>
              <MenuItem value="Other Biologicals">Other Biologicals</MenuItem>
            </Select>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="small" onClick={() => { setSearch(''); setCategoryFilter(''); }} sx={{ color: '#64748b', textTransform: 'none', fontSize: 12.5 }}>
              Reset filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={36} sx={{ color: '#2563eb' }} />
        </Box>
      ) : filteredPresets.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: '1px solid #dbeafe', borderRadius: 3 }}>
          <VaccineIcon sx={{ fontSize: 48, color: '#bfdbfe', mb: 1.5 }} />
          <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#334155' }}>
            No vaccine types found
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#64748b', mt: 0.5, mb: 2 }}>
            {search || categoryFilter ? 'No saved type matches the current filters.' : 'Start by saving the first vaccine type rule for your clinic.'}
          </Typography>
          {isAdmin && (
            <Button
              variant="contained"
              onClick={() => {
                setSelectedPreset(null);
                setDialogOpen(true);
              }}
              sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' }, textTransform: 'none', fontWeight: 700 }}
            >
              Save first vaccine type
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
                    border: '1px solid #dbeafe',
                    borderRadius: 3,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      boxShadow: '0 10px 24px rgba(37,99,235,0.08)',
                      borderColor: '#93c5fd',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
                      <Chip
                        label={preset.category || 'General'}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          bgcolor: categoryStyle.bg,
                          color: categoryStyle.color,
                          border: `1px solid ${categoryStyle.border}`,
                        }}
                      />
                      {isAdmin && (
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Edit vaccine type">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedPreset(preset);
                                setDialogOpen(true);
                              }}
                              sx={{ color: '#64748b', '&:hover': { color: '#2563eb', bgcolor: '#eff6ff' } }}
                            >
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete vaccine type">
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

                    <Typography sx={{ fontWeight: 800, fontSize: 15.5, color: '#0f172a', lineHeight: 1.3, mb: 1 }}>
                      {preset.vaccine_name}
                    </Typography>

                    <Stack spacing={1} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                        <CalendarIcon sx={{ fontSize: 16, color: '#2563eb', mt: 0.2 }} />
                        <Box>
                          <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 800 }}>Shelf-life rule</Typography>
                          <Typography sx={{ fontSize: 12.5, color: '#1f2937', fontWeight: 700 }}>
                            {preset.default_shelf_life_months} months from Manufactured Date
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                        <TimeIcon sx={{ fontSize: 16, color: '#c2410c', mt: 0.2 }} />
                        <Box>
                          <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 800 }}>Opened-vial discard rule</Typography>
                          <Typography sx={{ fontSize: 12.5, color: '#1f2937', fontWeight: 700 }}>
                            {preset.default_open_vial_hours ? `Discard by ${preset.default_open_vial_hours} hour(s) after opening` : 'Not used for single-dose stock'}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                        <RegimenIcon sx={{ fontSize: 16, color: '#047857', mt: 0.2 }} />
                        <Box>
                          <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 800 }}>Units per patient regimen</Typography>
                          <Typography sx={{ fontSize: 12.5, color: '#1f2937', fontWeight: 700 }}>
                            {preset.regimen_units_per_patient || 1}
                          </Typography>
                          {preset.dosing_regimen_notes && (
                            <Typography sx={{ fontSize: 11.5, color: '#64748b', mt: 0.35, lineHeight: 1.4 }}>
                              {preset.dosing_regimen_notes}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                        <ColdChainIcon sx={{ fontSize: 16, color: '#0369a1', mt: 0.2 }} />
                        <Box>
                          <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 800 }}>Storage / cold-chain notes</Typography>
                          <Typography sx={{ fontSize: 12.5, color: '#1f2937', lineHeight: 1.4 }}>
                            {preset.storage_temperature_notes || 'No storage note saved.'}
                          </Typography>
                        </Box>
                      </Box>
                    </Stack>

                    <Box sx={{ mt: 'auto', pt: 1.5, borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: 12, color: '#475569', fontWeight: 700 }}>
                        {preset.active_batches_count || 0} active batch(es) • {preset.total_stock || 0} total units
                      </Typography>

                      {onStockBatch && (
                        <Button
                          size="small"
                          startIcon={<AddStockIcon sx={{ fontSize: 14 }} />}
                          onClick={() => onStockBatch(preset.vaccine_name)}
                          sx={{ textTransform: 'none', fontSize: 12, fontWeight: 800, color: '#059669', '&:hover': { bgcolor: '#ecfdf5' } }}
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

      <VaccineTypeDialog
        open={dialogOpen}
        preset={selectedPreset}
        onClose={() => setDialogOpen(false)}
        onSaved={(saved) => {
          setAlert({ message: `Vaccine type "${saved.vaccine_name}" saved successfully.`, severity: 'success' });
          loadPresets();
        }}
      />

      {deleteTarget && (
        <ConfirmationDialog
          variant="danger"
          colorVariant="danger"
          title="Delete vaccine type"
          message={`Remove "${deleteTarget.vaccine_name}" from the setup catalog? Existing historical records will remain, but staff will no longer be able to choose this type for new stock.`}
          confirmLabel="Delete vaccine type"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Box>
  );
}
