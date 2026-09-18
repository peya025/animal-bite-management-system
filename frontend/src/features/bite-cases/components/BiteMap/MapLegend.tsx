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
        bgcolor: 'var(--card-bg-solid, #ffffff)',
        border: '1px solid var(--border-glow, rgba(16, 185, 129, 0.2))',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        borderRadius: 2.5,
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, fontSize: 13, color: 'var(--text-h, #111827)' }}>
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
                border: '2px solid rgba(255,255,255,0.8)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                flexShrink: 0,
              }} 
            />
            <Box>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, color: 'var(--text-h, #111827)' }}>
                Category III
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'var(--text-m, #6b7280)' }}>
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
                border: '2px solid rgba(255,255,255,0.8)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                flexShrink: 0,
              }} 
            />
            <Box>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, color: 'var(--text-h, #111827)' }}>
                Category II
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'var(--text-m, #6b7280)' }}>
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
                border: '2px solid rgba(255,255,255,0.8)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                flexShrink: 0,
              }} 
            />
            <Box>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, color: 'var(--text-h, #111827)' }}>
                Category I
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'var(--text-m, #6b7280)' }}>
                Minor
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ my: 1.5, height: '1px', bgcolor: 'var(--border-glow, rgba(0,0,0,0.1))' }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontSize: 13, color: 'var(--text-h, #111827)' }}>
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
                bgcolor: 'var(--card-bg-solid, #ffffff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 800,
                color: 'var(--text-h, #0f172a)',
              }} 
            >
              2
            </Box>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, color: 'var(--text-h, #111827)' }}>
              Mixed Categories
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'var(--text-m, #6b7280)', display: 'block', lineHeight: 1.2 }}>
              Ring colors show categories present; hover shows details
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
