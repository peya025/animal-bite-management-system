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

        <Box sx={{ my: 1.5, height: '1px', bgcolor: 'divider' }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontSize: 13 }}>
          Case Clusters
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box 
            sx={{ 
              width: 26, 
              height: 26, 
              borderRadius: '50%', 
              background: 'conic-gradient(#ef4444 0% 50%, #f59e0b 50% 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
              flexShrink: 0,
            }}
          >
            <Box 
              sx={{ 
                width: 18, 
                height: 18, 
                borderRadius: '50%', 
                bgcolor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 800,
                color: '#0f172a',
              }}
            >
              2
            </Box>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
              Mixed Categories
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block', lineHeight: 1.2 }}>
              Ring colors show categories present; hover shows details
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
