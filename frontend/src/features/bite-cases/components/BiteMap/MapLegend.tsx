import { Box, Typography, Divider, useTheme } from '@mui/material';

interface LegendItem {
  key: string;
  label: string;
  description: string;
  color?: string;
  isCluster?: boolean;
  tooltip?: string;
}

const LEGEND_ITEMS: LegendItem[] = [
  {
    key: 'cat1',
    label: 'Category I',
    description: 'Minor',
    color: '#10b981',
  },
  {
    key: 'cat2',
    label: 'Category II',
    description: 'Moderate',
    color: '#f59e0b',
  },
  {
    key: 'cat3',
    label: 'Category III',
    description: 'Severe',
    color: '#ef4444',
  },
  {
    key: 'cluster',
    label: 'Case Clusters',
    description: 'Multiple bite cases in one location',
    isCluster: true,
    tooltip: 'Ring colors show categories present; hover shows details, click to zoom in',
  },
];

export default function MapLegend() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      data-walkthrough="bitemap-legend"
      data-tour="bitemap-legend"
      role="region"
      aria-label="Bite Categories Legend"
      sx={{
        position: 'absolute',
        bottom: { xs: 8, sm: 12 },
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        columnGap: { xs: 1.5, sm: 2, md: 2.5 },
        rowGap: 1,
        px: { xs: 1.75, sm: 2.25 },
        py: { xs: 0.75, sm: 0.85 },
        bgcolor: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid',
        borderColor: isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.2)',
        boxShadow: isDark
          ? '0 4px 18px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(16, 185, 129, 0.1)'
          : '0 4px 16px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
        borderRadius: '16px',
        maxWidth: 'calc(100% - 24px)',
        width: 'max-content',
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      {LEGEND_ITEMS.map((item, index) => (
        <Box
          key={item.key}
          sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2, md: 2.5 } }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
            title={item.tooltip}
          >
            {item.isCluster ? (
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'conic-gradient(#ef4444 0% 33%, #f59e0b 33% 66%, #10b981 66% 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    bgcolor: isDark ? '#1e293b' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9.5px',
                    fontWeight: 800,
                    color: isDark ? '#ffffff' : '#0f172a',
                  }}
                >
                  2
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  position: 'relative',
                  width: 18,
                  height: 18,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 18,
                    height: 18,
                    bgcolor: item.color,
                    borderRadius: '50% 50% 50% 0',
                    transform: 'rotate(-45deg)',
                    border: '2px solid rgba(255, 255, 255, 0.95)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 3,
                    left: 5.5,
                    width: 7,
                    height: 7,
                    bgcolor: '#ffffff',
                    borderRadius: '50%',
                  }}
                />
              </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography
                sx={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '12px',
                  fontWeight: 600,
                  color: isDark ? '#ffffff' : '#111827',
                  lineHeight: 1.25,
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '10.5px',
                  fontWeight: 400,
                  color: isDark ? '#94a3b8' : '#6b7280',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                }}
              >
                {item.description}
              </Typography>
            </Box>
          </Box>

          {index < LEGEND_ITEMS.length - 1 && (
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                height: 20,
                alignSelf: 'center',
                display: { xs: 'none', sm: 'block' },
              }}
            />
          )}
        </Box>
      ))}
    </Box>
  );
}
