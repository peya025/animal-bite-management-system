import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Place as PinsIcon,
  Whatshot as HeatmapIcon,
  FilterAlt as FilterIcon,
  CalendarToday as CalendarTodayIcon,
  DateRange as DateRangeIcon,
  CalendarMonth as CalendarMonthIcon,
  History as HistoryIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import BiteMap from '../components/BiteMap/BiteMap';
import MapLegend from '../components/BiteMap/MapLegend';
import biteCaseService from '../services/biteCaseService';
import type { BiteMapData, MapFilters } from '../types/biteCase.types';
import { Icon } from '../../../shared/components/ui/Icon';
import '../../developer/styles/DeveloperDatabaseExplorer.css';

export default function BiteMapPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<BiteMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'pins' | 'heatmap'>('pins');

  const computeDateRange = (preset: string): { date_from?: string; date_to?: string } => {
    const today = new Date();
    if (preset === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return { date_from: startOfWeek.toISOString().split('T')[0] };
    }
    if (preset === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { date_from: startOfMonth.toISOString().split('T')[0] };
    }
    if (preset === 'last30') {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return { date_from: thirtyDaysAgo.toISOString().split('T')[0] };
    }
    return {};
  };

  const loadMapData = async () => {
    try {
      setLoading(true);
      const dateRange = computeDateRange(datePreset);
      const filters: MapFilters = {
        ...dateRange,
        severity: selectedSeverity !== 'all' ? (selectedSeverity as any) : undefined,
      };
      const mapData = await biteCaseService.getMapData(filters);
      setData(mapData);
    } catch (error) {
      console.error('Failed to load map data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMapData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datePreset, selectedSeverity]);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Box sx={{ px: 3 }}>
      {/* ── Header (Matching Patient Queue Page Typography & Breadcrumbs) ── */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography
            component="h1"
            sx={{
              fontWeight: 600,
              fontSize: '25px',
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
              color: 'var(--text-h)',
              margin: '0 0 7px 0',
            }}
          >
            Bite Location Map
          </Typography>
          <Typography sx={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)', margin: 0 }}>
            {todayStr} · Geographical distribution of animal bite incidents by WHO category
            {data?.clinic?.municipality && ` • ${data.clinic.municipality}, ${data.clinic.province}`}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '13px' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#3b82f6',
                fontSize: '13px',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Dashboard
            </button>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Bite Location Map</span>
          </Box>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {loading && <CircularProgress size={18} sx={{ color: '#10b981' }} />}
          <Tooltip title="Refresh Map">
            <span>
              <IconButton onClick={loadMapData} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── Interactive Filter & View Mode Controls Toolbar ── */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 3,
          border: '1px solid var(--card-border)',
          borderRadius: 2.5,
          bgcolor: 'var(--card-bg)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        {/* Left Side: Filter Options */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
            <FilterIcon sx={{ fontSize: 18, color: '#10b981' }} /> Filter Map:
          </Box>

          {/* Date Filter Quick Presets */}
          <Select
            size="small"
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            sx={{ fontSize: 13, height: 36, bgcolor: 'var(--input-bg)', color: 'var(--input-text)', borderRadius: 1.5 }}
            MenuProps={{ style: { maxHeight: 260 } }}
          >
            <MenuItem value="all">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarTodayIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
                <span>All Time</span>
              </Box>
            </MenuItem>
            <MenuItem value="week">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DateRangeIcon sx={{ fontSize: 16, color: '#10b981' }} />
                <span>This Week</span>
              </Box>
            </MenuItem>
            <MenuItem value="month">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarMonthIcon sx={{ fontSize: 16, color: '#8b5cf6' }} />
                <span>This Month</span>
              </Box>
            </MenuItem>
            <MenuItem value="last30">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HistoryIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                <span>Last 30 Days</span>
              </Box>
            </MenuItem>
          </Select>

          {/* Severity Category Filter */}
          <Select
            size="small"
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            sx={{ fontSize: 13, height: 36, bgcolor: 'var(--input-bg)', color: 'var(--input-text)', borderRadius: 1.5 }}
            MenuProps={{ style: { maxHeight: 260 } }}
          >
            <MenuItem value="all">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CategoryIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                <span>All Categories</span>
              </Box>
            </MenuItem>
            <MenuItem value="severe">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }} />
                <span>Category III (Severe)</span>
              </Box>
            </MenuItem>
            <MenuItem value="moderate">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                <span>Category II (Moderate)</span>
              </Box>
            </MenuItem>
            <MenuItem value="minor">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                <span>Category I (Minor)</span>
              </Box>
            </MenuItem>
          </Select>
        </Stack>

        {/* Right Side: Map View Mode Toggle */}
        <ButtonGroup size="small" variant="outlined" sx={{ borderRadius: 2 }}>
          <Button
            variant={viewMode === 'pins' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('pins')}
            startIcon={<PinsIcon sx={{ fontSize: 16 }} />}
            sx={{
              textTransform: 'none',
              fontSize: 12,
              fontWeight: 600,
              bgcolor: viewMode === 'pins' ? '#10b981' : undefined,
              borderColor: '#d1d5db',
              '&:hover': { bgcolor: viewMode === 'pins' ? '#059669' : undefined },
            }}
          >
            Pins & Clusters
          </Button>
          <Button
            variant={viewMode === 'heatmap' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('heatmap')}
            startIcon={<HeatmapIcon sx={{ fontSize: 16 }} />}
            sx={{
              textTransform: 'none',
              fontSize: 12,
              fontWeight: 600,
              bgcolor: viewMode === 'heatmap' ? '#ef4444' : undefined,
              borderColor: '#d1d5db',
              '&:hover': { bgcolor: viewMode === 'heatmap' ? '#dc2626' : undefined },
            }}
          >
            Density Heatmap
          </Button>
        </ButtonGroup>
      </Paper>

      {/* ── KPI Summary Cards (Matching Staff Activity Monitor Design) ── */}
      {data && (
        <div className="db-kpi-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="db-kpi-card">
            <div className="db-kpi-header">
              <span className="db-kpi-label">TOTAL CASES</span>
              <Icon name="activity" size={16} color="var(--primary)" />
            </div>
            <div className="db-kpi-value">{data.statistics.total_cases}</div>
            <div className="db-kpi-sub">All Categories Logged</div>
          </div>

          <div className="db-kpi-card">
            <div className="db-kpi-header">
              <span className="db-kpi-label">CATEGORY III</span>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} />
            </div>
            <div className="db-kpi-value" style={{ color: '#ef4444' }}>
              {data.statistics.by_severity.severe}
            </div>
            <div className="db-kpi-sub" style={{ color: '#ef4444' }}>Severe Bites</div>
          </div>

          <div className="db-kpi-card">
            <div className="db-kpi-header">
              <span className="db-kpi-label">CATEGORY II</span>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f59e0b' }} />
            </div>
            <div className="db-kpi-value" style={{ color: '#f59e0b' }}>
              {data.statistics.by_severity.moderate}
            </div>
            <div className="db-kpi-sub" style={{ color: '#f59e0b' }}>Moderate Bites</div>
          </div>

          <div className="db-kpi-card">
            <div className="db-kpi-header">
              <span className="db-kpi-label">CATEGORY I</span>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#10b981' }} />
            </div>
            <div className="db-kpi-value" style={{ color: '#10b981' }}>
              {data.statistics.by_severity.minor}
            </div>
            <div className="db-kpi-sub" style={{ color: '#10b981' }}>Minor Bites</div>
          </div>
        </div>
      )}

      {/* ── Map Container Paper (System Standard) ── */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'var(--table-row-border)',
          borderRadius: 3,
          overflow: 'hidden',
          background: 'var(--card-bg)',
          p: 2,
          position: 'relative',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 8, gap: 2 }}>
            <CircularProgress sx={{ color: '#10b981' }} />
            <Typography sx={{ fontSize: 13, color: '#6b7280' }}>Loading incident map data...</Typography>
          </Box>
        ) : data ? (
          <Box sx={{ position: 'relative', height: '650px', width: '100%' }}>
            <BiteMap
              cases={data.cases}
              mapCenter={data.map_center}
              mapZoom={data.map_zoom}
              viewMode={viewMode}
            />
            <MapLegend />
          </Box>
        ) : (
          <Typography sx={{ fontSize: 13, color: '#6b7280', p: 3, textAlign: 'center' }}>
            No map data available for selected filter range.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
