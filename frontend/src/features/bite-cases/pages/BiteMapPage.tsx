import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Pets as AnimalIcon,
  Refresh as RefreshIcon,
  ErrorOutlined as SevereIcon,
  Warning as ModIcon,
  CheckCircle as MinorIcon,
  Map as MapIcon,
} from '@mui/icons-material';
import BiteMap from '../components/BiteMap/BiteMap';
import biteCaseService from '../services/biteCaseService';
import type { BiteMapData, MapFilters } from '../types/biteCase.types';
import StatCard from '../../../components/common/StatCard';

export default function BiteMapPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<BiteMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters] = useState<MapFilters>({});

  useEffect(() => {
    loadMapData();
  }, [filters]);

  const loadMapData = async () => {
    try {
      setLoading(true);
      const mapData = await biteCaseService.getMapData(filters);
      setData(mapData);
    } catch (error) {
      console.error('Failed to load map data:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const statCardsData = [
    {
      label: 'Total Cases',
      value: data?.statistics?.total_cases ?? 0,
      icon: <AnimalIcon sx={{ fontSize: 14 }} />,
      color: 'primary' as const,
    },
    {
      label: 'Severe Cases',
      value: data?.statistics?.by_severity?.severe ?? 0,
      icon: <SevereIcon sx={{ fontSize: 14 }} />,
      color: 'error' as const,
    },
    {
      label: 'Moderate Cases',
      value: data?.statistics?.by_severity?.moderate ?? 0,
      icon: <ModIcon sx={{ fontSize: 14 }} />,
      color: 'warning' as const,
    },
    {
      label: 'Minor Cases',
      value: data?.statistics?.by_severity?.minor ?? 0,
      icon: <MinorIcon sx={{ fontSize: 14 }} />,
      color: 'success' as const,
    },
  ];

  return (
    <Box sx={{ px: 3 }}>
      {/* ── Header (Identical to Queue Page) ── */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography
            component="h1"
            sx={{
              fontWeight: 600,
              fontSize: '25px',
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
              color: '#173d29',
              margin: '0 0 7px 0',
            }}
          >
            Bite Location Map
          </Typography>
          <Typography sx={{ fontSize: '13px', lineHeight: 1.5, color: '#77877d', margin: 0 }}>
            {today} · Geographical distribution of animal bite incidents
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
          <Tooltip title="Refresh">
            <IconButton onClick={loadMapData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── Statistics Cards Grid (Identical to Queue Page) ── */}
      <Grid container spacing={2} sx={{ mb: 3, alignItems: 'stretch' }}>
        {statCardsData.map((s) => (
          <Grid key={s.label} item xs={6} sm={3}>
            <StatCard
              label={s.label}
              value={s.value}
              icon={s.icon}
              color={s.color}
              loading={loading}
            />
          </Grid>
        ))}
      </Grid>

      {/* ── Map Container Paper (System standard paper container) ── */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: '#f3f4f6',
          borderRadius: 3,
          overflow: 'hidden',
          background: '#ffffff',
          p: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <MapIcon sx={{ color: '#10b981', fontSize: 20 }} />
          <Typography sx={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>
            Geographical Incident Surveillance Map
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 8, gap: 2 }}>
            <CircularProgress sx={{ color: '#10b981' }} />
            <Typography sx={{ fontSize: 13, color: '#6b7280' }}>Loading incident map data...</Typography>
          </Box>
        ) : data ? (
          <BiteMap cases={data.cases} />
        ) : (
          <Typography sx={{ fontSize: 13, color: '#6b7280', p: 3, textAlign: 'center' }}>
            No map data available.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
