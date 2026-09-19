import { useEffect, useState, type ReactNode } from 'react';
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
import { useTheme } from '@mui/material/styles';
import BiteMap from '../components/BiteMap/BiteMap';
import MapLegend from '../components/BiteMap/MapLegend';
import biteCaseService from '../services/biteCaseService';
import type { BiteMapData, MapFilters } from '../types/biteCase.types';
import { Icon } from '../../../shared/components/ui/Icon';
import '../../developer/styles/DeveloperDatabaseExplorer.css';

export default function BiteMapPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [data, setData] = useState<BiteMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
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
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
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
  }, [datePreset, selectedSeverity, selectedStatus]);

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

      {/* Filter controls are now inside the same map container below */}

      {/* ── KPI Summary Cards (Adaptive Glowing Pillow Aesthetic) ── */}
      {data && (() => {
        const kpiItems = [
          {
            id: 'total',
            label: 'TOTAL CASES',
            value: data.statistics.total_cases,
            sub: data.statistics.by_status
              ? `${data.statistics.by_status.active} Active · ${data.statistics.by_status.completed} Completed`
              : 'All Categories Logged',
            badge: null,
            icon: <Icon name="activity" size={15} color="#10b981" />,
            color: '#10b981',
            glowColor: 'rgba(163, 230, 53, 0.3)',
          },
          {
            id: 'cat3',
            label: 'CATEGORY III',
            value: data.statistics.by_severity.severe,
            sub: 'Severe Transdermal Bites',
            badge: 'High Risk',
            icon: null,
            color: '#ef4444',
            glowColor: 'rgba(239, 68, 68, 0.3)',
          },
          {
            id: 'cat2',
            label: 'CATEGORY II',
            value: data.statistics.by_severity.moderate,
            sub: 'Minor Scratches & Abrasions',
            badge: 'Moderate',
            icon: null,
            color: '#f59e0b',
            glowColor: 'rgba(245, 158, 11, 0.3)',
          },
          {
            id: 'cat1',
            label: 'CATEGORY I',
            value: data.statistics.by_severity.minor,
            sub: 'Intact Skin / Minor Bites',
            badge: 'Low Risk',
            icon: null,
            color: '#10b981',
            glowColor: 'rgba(16, 185, 129, 0.3)',
          },
        ];

        return (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
              mb: 2.5,
            }}
          >
            {kpiItems.map((item) => (
              <Paper
                key={item.id}
                elevation={0}
                sx={{
                  p: '16px 18px',
                  borderRadius: '20px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 118,
                  cursor: 'default',
                  ...(isDark
                    ? {
                        background: 'radial-gradient(ellipse at 30% 0%, #1e2e22 0%, #121c15 55%, #0a110d 100%)',
                        border: '1px solid rgba(163, 230, 53, 0.3)',
                        boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.6), 0 0 25px -4px rgba(163, 230, 53, 0.2), inset 0 1px 2px 0 rgba(255, 255, 255, 0.2), inset 0 0 0 1px rgba(163, 230, 53, 0.12)',
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          borderColor: 'rgba(163, 230, 53, 0.55)',
                          boxShadow: `0 14px 34px -4px rgba(0, 0, 0, 0.7), 0 0 35px -2px rgba(163, 230, 53, 0.35), inset 0 1px 3px 0 rgba(255, 255, 255, 0.3)`,
                        },
                      }
                    : {
                        background: 'radial-gradient(ellipse at 30% 0%, #ecfdf5 0%, #f4fbf7 45%, #ffffff 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.32)',
                        boxShadow: '0 8px 24px -4px rgba(16, 185, 129, 0.15), 0 0 18px -3px rgba(132, 204, 22, 0.15), inset 0 1px 2px 0 rgba(255, 255, 255, 0.95), inset 0 0 0 1px rgba(16, 185, 129, 0.12)',
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          borderColor: 'rgba(16, 185, 129, 0.55)',
                          boxShadow: `0 12px 28px -4px rgba(16, 185, 129, 0.25), 0 0 25px -2px rgba(132, 204, 22, 0.22), inset 0 1px 2px 0 rgba(255, 255, 255, 1)`,
                        },
                      }),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isDark ? '#a7f3d0' : '#047857',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {item.label}
                  </Typography>
                  {item.badge ? (
                    <Box
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: 999,
                        bgcolor: `${item.color}22`,
                        border: `1px solid ${item.color}50`,
                        color: item.color,
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {item.badge}
                    </Box>
                  ) : item.icon ? (
                    <Box
                      sx={{
                        p: 0.6,
                        bgcolor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                        border: isDark ? '1px solid rgba(163, 230, 53, 0.3)' : '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '8px',
                        display: 'flex',
                      }}
                    >
                      {item.icon}
                    </Box>
                  ) : null}
                </Box>
                <Typography
                  sx={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: isDark ? '#ffffff' : '#064e3b',
                    lineHeight: 1.1,
                    my: 0.5,
                    letterSpacing: '-0.5px',
                  }}
                >
                  {item.value}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 11,
                    color: isDark ? '#a7f3d0' : '#4b5563',
                    fontWeight: 500,
                  }}
                >
                  {item.sub}
                </Typography>
              </Paper>
            ))}
          </Box>
        );
      })()}

      {/* ── Unified Map Container (Filter + Map in same div/paper) ── */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'var(--table-row-border)',
          borderRadius: 3,
          overflow: 'hidden',
          background: 'var(--card-bg)',
          position: 'relative',
        }}
      >
        {/* Top toolbar inside same container */}
        <Box
          sx={{
            p: 1.5,
            borderBottom: '1px solid var(--table-row-border)',
            bgcolor: 'var(--card-bg)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>
              <FilterIcon sx={{ fontSize: 18, color: '#10b981' }} /> Filter Map:
            </Box>

            <Select
              size="small"
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              renderValue={(value) => {
                const dateOptionMap: Record<string, { label: string; icon: ReactNode }> = {
                  all: { label: 'All Time', icon: <CalendarTodayIcon sx={{ fontSize: 16, color: '#5f99f6' }} /> },
                  week: { label: 'This Week', icon: <DateRangeIcon sx={{ fontSize: 16, color: '#32c48d' }} /> },
                  month: { label: 'This Month', icon: <CalendarMonthIcon sx={{ fontSize: 16, color: '#8b5cf6' }} /> },
                  last30: { label: 'Last 30 Days', icon: <HistoryIcon sx={{ fontSize: 16, color: '#f59e0b' }} /> },
                };
                const option = dateOptionMap[String(value)] ?? dateOptionMap.all;

                return (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {option.icon}
                    <Box
                      component="span"
                      sx={{
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {option.label}
                    </Box>
                  </Box>
                );
              }}
              sx={{
                width: 148,
                bgcolor: isDark ? '#0b140f' : '#ffffff',
                color: isDark ? '#ffffff' : '#6f879d',
                borderRadius: 2.5,
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 1px 2px rgba(15, 23, 42, 0.05)',
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  py: 1,
                  pl: 1.5,
                  pr: 4.5,
                },
                '& .MuiSelect-icon': {
                  color: isDark ? '#a7f3d0' : '#8aa0b3',
                  fontSize: 18,
                  right: 10,
                  top: 'calc(50% - 9px)',
                },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? 'rgba(163, 230, 53, 0.25)' : '#e9eef3' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? 'rgba(163, 230, 53, 0.5)' : '#dde6ee' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#10b981', borderWidth: '1px' },
              }}
              MenuProps={{
                disableScrollLock: true,
                slotProps: {
                  paper: {
                    sx: {
                      width: 148,
                      minWidth: 148,
                      maxWidth: 148,
                      mt: 0.5,
                      borderRadius: 2.5,
                      overflow: 'hidden',
                      bgcolor: isDark ? '#0e1812' : '#ffffff',
                      border: isDark ? '1px solid rgba(163, 230, 53, 0.25)' : 'none',
                    },
                  },
                  list: {
                    sx: {
                      p: 0.5,
                    },
                  },
                },
              }}
            >
              <MenuItem value="all" sx={{ px: 1.75, py: 1.15, minHeight: 42, fontSize: 13, lineHeight: 1.4, bgcolor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#effaf7' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%' }}>
                  <CalendarTodayIcon sx={{ fontSize: 17, color: '#5f99f6' }} />
                  <span style={{ fontSize: '13px' }}>All Time</span>
                </Box>
              </MenuItem>
              <MenuItem value="week" sx={{ px: 1.75, py: 1.15, minHeight: 42, fontSize: 13, lineHeight: 1.4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%' }}>
                  <DateRangeIcon sx={{ fontSize: 17, color: '#32c48d' }} />
                  <span style={{ fontSize: '13px' }}>This Week</span>
                </Box>
              </MenuItem>
              <MenuItem value="month" sx={{ px: 1.75, py: 1.15, minHeight: 42, fontSize: 13, lineHeight: 1.4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%' }}>
                  <CalendarMonthIcon sx={{ fontSize: 17, color: '#8b5cf6' }} />
                  <span style={{ fontSize: '13px' }}>This Month</span>
                </Box>
              </MenuItem>
              <MenuItem value="last30" sx={{ px: 1.75, py: 1.15, minHeight: 42, fontSize: 13, lineHeight: 1.4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%' }}>
                  <HistoryIcon sx={{ fontSize: 17, color: '#f59e0b' }} />
                  <span style={{ fontSize: '13px' }}>Last 30 Days</span>
                </Box>
              </MenuItem>
            </Select>

            <Select
              size="small"
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              renderValue={(value) => {
                const severityOptionMap: Record<string, { label: string; icon: ReactNode }> = {
                  all: { label: 'All Categories', icon: <CategoryIcon sx={{ fontSize: 16, color: '#7d93aa' }} /> },
                  severe: { label: 'Category III (Severe)', icon: <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444', flexShrink: 0 }} /> },
                  moderate: { label: 'Category II (Moderate)', icon: <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b', flexShrink: 0 }} /> },
                  minor: { label: 'Category I (Minor)', icon: <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981', flexShrink: 0 }} /> },
                };
                const option = severityOptionMap[String(value)] ?? severityOptionMap.all;

                return (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {option.icon}
                    <Box
                      component="span"
                      sx={{
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {option.label}
                    </Box>
                  </Box>
                );
              }}
              sx={{
                width: 212,
                bgcolor: isDark ? '#0b140f' : '#ffffff',
                color: isDark ? '#ffffff' : '#6f879d',
                borderRadius: 2.5,
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 1px 2px rgba(15, 23, 42, 0.05)',
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  py: 1,
                  pl: 1.5,
                  pr: 4.5,
                },
                '& .MuiSelect-icon': {
                  color: isDark ? '#a7f3d0' : '#8aa0b3',
                  fontSize: 18,
                  right: 10,
                  top: 'calc(50% - 9px)',
                },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? 'rgba(163, 230, 53, 0.25)' : '#e9eef3' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? 'rgba(163, 230, 53, 0.5)' : '#dde6ee' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#10b981', borderWidth: '1px' },
              }}
              MenuProps={{
                disableScrollLock: true,
                slotProps: {
                  paper: {
                    sx: {
                      width: 212,
                      minWidth: 212,
                      maxWidth: 212,
                      mt: 0.5,
                      borderRadius: 2.5,
                      overflow: 'hidden',
                      bgcolor: isDark ? '#0e1812' : '#ffffff',
                      border: isDark ? '1px solid rgba(163, 230, 53, 0.25)' : 'none',
                    },
                  },
                  list: {
                    sx: {
                      p: 0.5,
                    },
                  },
                },
              }}
            >
              <MenuItem value="all" sx={{ px: 1.75, py: 1.15, minHeight: 42, fontSize: 13, lineHeight: 1.4, bgcolor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#effaf7' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%' }}>
                  <CategoryIcon sx={{ fontSize: 17, color: isDark ? '#a7f3d0' : '#7d93aa' }} />
                  <span style={{ fontSize: '13px' }}>All Categories</span>
                </Box>
              </MenuItem>
              <MenuItem value="severe" sx={{ px: 1.75, py: 1.15, minHeight: 42, fontSize: 13, lineHeight: 1.4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }} />
                  <span style={{ fontSize: '13px' }}>Category III (Severe)</span>
                </Box>
              </MenuItem>
              <MenuItem value="moderate" sx={{ px: 1.75, py: 1.15, minHeight: 42, fontSize: 13, lineHeight: 1.4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                  <span style={{ fontSize: '13px' }}>Category II (Moderate)</span>
                </Box>
              </MenuItem>
              <MenuItem value="minor" sx={{ px: 1.75, py: 1.15, minHeight: 42, fontSize: 13, lineHeight: 1.4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                  <span style={{ fontSize: '13px' }}>Category I (Minor)</span>
                </Box>
              </MenuItem>
            </Select>

            <Select
              size="small"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              renderValue={(value) => {
                const statusMap: Record<string, { label: string; dotColor: string }> = {
                  all: { label: 'All Cases (Active + Done)', dotColor: '#3b82f6' },
                  active: { label: 'Active PEP Only', dotColor: '#f59e0b' },
                  completed: { label: 'Completed Only', dotColor: '#10b981' },
                };
                const opt = statusMap[String(value)] ?? statusMap.all;
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, overflow: 'hidden' }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: opt.dotColor, flexShrink: 0 }} />
                    <Box component="span" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opt.label}
                    </Box>
                  </Box>
                );
              }}
              sx={{
                width: 195,
                bgcolor: isDark ? '#0b140f' : '#ffffff',
                color: isDark ? '#ffffff' : '#6f879d',
                borderRadius: 2.5,
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 1px 2px rgba(15, 23, 42, 0.05)',
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  py: 1,
                  pl: 1.5,
                  pr: 4.5,
                },
                '& .MuiSelect-icon': {
                  color: isDark ? '#a7f3d0' : '#8aa0b3',
                  fontSize: 18,
                  right: 10,
                  top: 'calc(50% - 9px)',
                },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? 'rgba(163, 230, 53, 0.25)' : '#e9eef3' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? 'rgba(163, 230, 53, 0.5)' : '#dde6ee' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#10b981', borderWidth: '1px' },
              }}
              MenuProps={{
                disableScrollLock: true,
                slotProps: {
                  paper: {
                    sx: {
                      width: 195,
                      minWidth: 195,
                      maxWidth: 195,
                      mt: 0.5,
                      borderRadius: 2.5,
                      overflow: 'hidden',
                      bgcolor: isDark ? '#0e1812' : '#ffffff',
                      border: isDark ? '1px solid rgba(163, 230, 53, 0.25)' : 'none',
                    },
                  },
                  list: { p: 0.5 },
                },
              }}
            >
              <MenuItem value="all" sx={{ px: 1.75, py: 1.15, minHeight: 42, fontSize: 13, lineHeight: 1.4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3b82f6' }} />
                  <span style={{ fontSize: '13px' }}>All Cases (Active + Done)</span>
                </Box>
              </MenuItem>
              <MenuItem value="active" sx={{ px: 1.75, py: 1.15, minHeight: 42, fontSize: 13, lineHeight: 1.4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                  <span style={{ fontSize: '13px' }}>Active PEP Only</span>
                </Box>
              </MenuItem>
              <MenuItem value="completed" sx={{ px: 1.75, py: 1.15, minHeight: 42, fontSize: 13, lineHeight: 1.4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                  <span style={{ fontSize: '13px' }}>Completed Only</span>
                </Box>
              </MenuItem>
            </Select>
          </Stack>

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
        </Box>

        <Box sx={{ p: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 8, gap: 2 }}>
              <CircularProgress sx={{ color: '#10b981' }} />
              <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading incident map data...</Typography>
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
            <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)', p: 3, textAlign: 'center' }}>
              No map data available for selected filter range.
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
