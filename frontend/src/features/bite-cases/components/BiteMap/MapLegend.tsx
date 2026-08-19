import { Box, Card, CardContent, Typography } from '@mui/material';

export default function MapLegend() {
  return (
    <Card 
      sx={{ 
        position: 'absolute', 
        bottom: 20, 
        right: 20, 
        zIndex: 1000,
        minWidth: 180,
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, fontSize: 13 }}>
          Bite Categories
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box 
              sx={{ 
                width: 20, 
                height: 20, 
                bgcolor: '#ef4444', 
                borderRadius: '50% 50% 50% 0',
                transform: 'rotate(-45deg)',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                flexShrink: 0,
              }} 
            />
            <Box>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                Category III
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                Severe
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box 
              sx={{ 
                width: 20, 
                height: 20, 
                bgcolor: '#f59e0b', 
                borderRadius: '50% 50% 50% 0',
                transform: 'rotate(-45deg)',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                flexShrink: 0,
              }} 
            />
            <Box>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                Category II
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                Moderate
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box 
              sx={{ 
                width: 20, 
                height: 20, 
                bgcolor: '#10b981', 
                borderRadius: '50% 50% 50% 0',
                transform: 'rotate(-45deg)',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                flexShrink: 0,
              }} 
            />
            <Box>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                Category I
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                Minor
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
