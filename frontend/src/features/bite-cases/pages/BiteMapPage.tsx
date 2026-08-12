import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import BiteMap from '../components/BiteMap/BiteMap';
import MapLegend from '../components/BiteMap/MapLegend';
import biteCaseService from '../services/biteCaseService';
import type { BiteMapData, MapFilters } from '../types/biteCase.types';

export default function BiteMapPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<BiteMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters] = useState<MapFilters>({});

  useEffect(() => {
    loadMapData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Box sx={{ px: 3 }}>
      {/* ── Header (Matching Patient Queue Page Typography & Breadcrumbs) ── */}
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
            {today} · Geographical distribution of animal bite incidents by WHO category
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
          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={loadMapData} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── Original Statistics Cards ── */}
      {data && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 0.5 }}>
                Total Cases
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {data.statistics.total_cases}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                All categories
              </Typography>
            </CardContent>
          </Card>
          <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 0.5 }}>
                Category III
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ef4444' }}>
                {data.statistics.by_severity.severe}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Severe bites
              </Typography>
            </CardContent>
          </Card>
          <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 0.5 }}>
                Category II
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                {data.statistics.by_severity.moderate}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Moderate bites
              </Typography>
            </CardContent>
          </Card>
          <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 0.5 }}>
                Category I
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#10b981' }}>
                {data.statistics.by_severity.minor}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Minor bites
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ── Map Container Paper (System Standard) ── */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: '#f3f4f6',
          borderRadius: 3,
          overflow: 'hidden',
          background: '#ffffff',
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
            />
            <MapLegend />
          </Box>
        ) : (
          <Typography sx={{ fontSize: 13, color: '#6b7280', p: 3, textAlign: 'center' }}>
            No map data available.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
