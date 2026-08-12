import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress } from '@mui/material';
import BiteMap from '../components/BiteMap/BiteMap';
import MapLegend from '../components/BiteMap/MapLegend';
import biteCaseService from '../services/biteCaseService';
import type { BiteMapData, MapFilters } from '../types/biteCase.types';

export default function BiteMapPage() {
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

  return (
    <Box sx={{ bgcolor: '#f9fafb', minHeight: '100vh' }}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Bite Location Map
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Geographical distribution of animal bite incidents by WHO category
          </Typography>
        </Box>

        {/* Statistics Cards */}
        {data && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
            <Card>
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
            <Card>
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
            <Card>
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
            <Card>
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

        {/* Map with Legend */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress />
          </Box>
        ) : data ? (
          <Box sx={{ position: 'relative' }}>
            <BiteMap cases={data.cases} />
            <MapLegend />
          </Box>
        ) : (
          <Typography>No data available</Typography>
        )}
      </Box>
    </Box>
  );
}
