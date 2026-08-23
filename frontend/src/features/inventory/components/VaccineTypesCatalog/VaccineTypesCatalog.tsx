import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Paper,
  CircularProgress,
  Alert,
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
  Inventory as StockIcon,
  AddShoppingCart as AddStockIcon,
} from '@mui/icons-material';
import { getVaccinePresets, deleteVaccinePreset } from '../../services/vaccineInventoryService';
import VaccineTypeDialog from '../VaccineTypeDialog/VaccineTypeDialog';
import ConfirmationDialog from '../../../../components/feedback/ConfirmationDialog';
import type { VaccineTypePreset } from '../../types';

interface VaccineTypesCatalogProps {
  onStockBatch?: (vaccineType: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'Anti-Rabies Vaccines (ARV)': { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  'Rabies Immunoglobulins (RIG)': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Tetanus & Toxoids': { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
  'Other Biologicals': { bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff' },
};

export default function VaccineTypesCatalog({ onStockBatch }: VaccineTypesCatalogProps) {
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
    loadPresets();
  }, []);

  const filteredPresets = useMemo(() => {
    return presets.filter((p) => {
      const matchSearch = p.vaccine_name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(search.toLowerCase());
      const matchCategory = !categoryFilter || p.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [presets, search, categoryFilter]);

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteVaccinePreset(deleteTarget.id);
      setAlert({ message: `Vaccine profile '${deleteTarget.vaccine_name}' deleted successfully.`, severity: 'success' });
      loadPresets();
    } catch (err: any) {
      setAlert({ message: err.response?.data?.message || 'Failed to delete vaccine profile', severity: 'error' });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <Box>
      {/* ── Top Alert ── */}
      {alert && (
        <Alert severity={alert.severity} onClose={() => setAlert(null)} sx={{ mb: 2.5 }}>
          {alert.message}
        </Alert>
      )}

      {/* ── Catalog Header & Actions ── */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1.15rem' }}>
              Vaccine Type Catalog &amp; Regimen Profiles
            </Typography>
            <Chip label={`${presets.length} Defined Types`} size="small" sx={{ fontWeight: 700, bgcolor: '#e0f2fe', color: '#0369a1' }} />
          </Box>
          <Typography sx={{ fontSize: 13, color: '#64748b', mt: 0.25 }}>
            Central catalog defining shelf-life durations, open-vial discard parameters, dosing schedules, and cold-chain rules.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedPreset(null);
            setDialogOpen(true);
          }}
          sx={{
            bgcolor: '#0284c7',
            '&:hover': { bgcolor: '#0369a1' },
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            px: 2.5,
            boxShadow: '0 2px 8px rgba(2,132,199,0.25)',
          }}
        >
          + Add New Vaccine Type Profile
        </Button>
      </Box>

      {/* ── Filter Bar ── */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e2e8f0', borderRadius: 2.5, bgcolor: '#fff' }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search vaccine profiles by name or category…"
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
              <MenuItem value="">All Vaccine Categories</MenuItem>
              <MenuItem value="Anti-Rabies Vaccines (ARV)">Anti-Rabies Vaccines (ARV)</MenuItem>
              <MenuItem value="Rabies Immunoglobulins (RIG)">Rabies Immunoglobulins (RIG)</MenuItem>
              <MenuItem value="Tetanus & Toxoids">Tetanus &amp; Toxoids</MenuItem>
              <MenuItem value="Other Biologicals">Other Biologicals</MenuItem>
            </Select>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              size="small"
              onClick={() => { setSearch(''); setCategoryFilter(''); }}
              sx={{ color: '#64748b', textTransform: 'none', fontSize: 12.5 }}
            >
              Reset Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* ── Catalog Cards Grid ── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={36} sx={{ color: '#0284c7' }} />
        </Box>
      ) : filteredPresets.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 3 }}>
          <VaccineIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1.5 }} />
          <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#334155' }}>
            No Vaccine Type Profiles Found
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#64748b', mt: 0.5, mb: 2 }}>
            {search || categoryFilter ? 'No profiles match your filters.' : 'Get started by creating your first vaccine type profile.'}
          </Typography>
          <Button
            variant="contained"
            onClick={() => { setSelectedPreset(null); setDialogOpen(true); }}
            sx={{ bgcolor: '#0284c7', textTransform: 'none', fontWeight: 600 }}
          >
            Register Vaccine Profile
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {filteredPresets.map((preset) => {
            const catStyle = CATEGORY_COLORS[preset.category || ''] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };

            return (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={preset.id || preset.vaccine_name}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid #e2e8f0',
                    borderRadius: 3,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                      borderColor: '#93c5fd',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Top Row: Category + Actions */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                      <Chip
                        label={preset.category || 'General Biological'}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: 10.5,
                          fontWeight: 700,
                          bgcolor: catStyle.bg,
                          color: catStyle.color,
                          border: `1px solid ${catStyle.border}`,
                        }}
                      />
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Edit Vaccine Type Profile">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedPreset(preset);
                              setDialogOpen(true);
                            }}
                            sx={{ color: '#64748b', '&:hover': { color: '#0284c7', bgcolor: '#f0f9ff' } }}
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
                    </Box>

                    {/* Vaccine Name */}
                    <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#0f172a', lineHeight: 1.3, mb: 0.5 }}>
                      {preset.vaccine_name}
                    </Typography>

                    {/* Route & Multi-dose Badge */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.75, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>
                        Route: <strong style={{ color: '#334155' }}>{preset.administration_route || 'Standard ID/IM'}</strong>
                      </Typography>
                      {preset.is_multidose && (
                        <Chip
                          label={`Multi-dose (${preset.doses_per_vial || 1} dose/vial)`}
                          size="small"
                          sx={{ height: 18, fontSize: 10, bgcolor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}
                        />
                      )}
                    </Box>

                    {/* Parameters Pill Bar */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.4, bgcolor: '#f0f9ff', borderRadius: 1.5, border: '1px solid #bae6fd' }}>
                        <CalendarIcon sx={{ fontSize: 14, color: '#0284c7' }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#0369a1' }}>
                          {preset.default_shelf_life_months}m Shelf-Life
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.4, bgcolor: '#fffbeb', borderRadius: 1.5, border: '1px solid #fde68a' }}>
                        <TimeIcon sx={{ fontSize: 14, color: '#d97706' }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#b45309' }}>
                          {preset.default_open_vial_hours ? `${preset.default_open_vial_hours}h Discard` : 'Single Dose'}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Dosing Regimen Note */}
                    {preset.dosing_regimen_notes && (
                      <Box sx={{ p: 1.25, mb: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #f1f5f9' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                          <RegimenIcon sx={{ fontSize: 13, color: '#64748b' }} />
                          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#475569' }}>
                            DOSING &amp; REGIMEN
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 11.5, color: '#334155', lineHeight: 1.4 }}>
                          {preset.dosing_regimen_notes}
                        </Typography>
                      </Box>
                    )}

                    {/* Cold Chain Protocol */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 2 }}>
                      <ColdChainIcon sx={{ fontSize: 14, color: '#059669', mt: 0.25 }} />
                      <Typography sx={{ fontSize: 11.5, color: '#475569', lineHeight: 1.35 }}>
                        {preset.storage_temperature_notes || 'Store at +2°C to +8°C. Cold-chain required.'}
                      </Typography>
                    </Box>

                    {/* Live Stock & Batch Counters Footer */}
                    <Box
                      sx={{
                        mt: 'auto',
                        pt: 1.5,
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StockIcon sx={{ fontSize: 16, color: '#64748b' }} />
                        <Typography sx={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                          Active Batches: <strong style={{ color: (preset.active_batches_count || 0) > 0 ? '#059669' : '#94a3b8' }}>{preset.active_batches_count || 0}</strong> ({preset.total_stock || 0} vials)
                        </Typography>
                      </Box>

                      {onStockBatch && (
                        <Button
                          size="small"
                          startIcon={<AddStockIcon sx={{ fontSize: 14 }} />}
                          onClick={() => onStockBatch(preset.vaccine_name)}
                          sx={{
                            textTransform: 'none',
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: '#059669',
                            p: '2px 8px',
                            '&:hover': { bgcolor: '#ecfdf5' },
                          }}
                        >
                          + Stock Batch
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

      {/* ── Unified Vaccine Type Dialog ── */}
      <VaccineTypeDialog
        open={dialogOpen}
        preset={selectedPreset}
        onClose={() => setDialogOpen(false)}
        onSaved={(saved) => {
          setAlert({ message: `Vaccine profile '${saved.vaccine_name}' saved successfully.`, severity: 'success' });
          loadPresets();
        }}
      />

      {/* ── Delete Confirmation Dialog ── */}
      {deleteTarget && (
        <ConfirmationDialog
          variant="danger"
          colorVariant="danger"
          title="Delete Vaccine Type Profile?"
          message={`Are you sure you want to remove '${deleteTarget.vaccine_name}' from the vaccine catalog? This action will not affect past treatment records.`}
          confirmLabel="Yes, Delete Profile"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Box>
  );
}
