import { Box, Paper, Skeleton, Typography } from '@mui/material';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

export default function StatCard({ label, value, icon, color, loading: isLoading }: StatCardProps) {
  // Soft, light color palette
  const softColors: Record<string, { main: string; light: string }> = {
    success: { main: '#6ee7b7', light: '#d1fae5' },  // lighter green
    info: { main: '#93c5fd', light: '#dbeafe' },     // lighter blue
    warning: { main: '#fbbf24', light: '#fef3c7' },  // lighter orange
    error: { main: '#fca5a5', light: '#fee2e2' },    // lighter red
    primary: { main: '#c4b5fd', light: '#ede9fe' },  // lighter purple
  };

  const softColor = softColors[color] || { main: '#d1d5db', light: '#f3f4f6' };

  // Random percentage for visual effect (you can make this dynamic based on actual data)
  const percentage = 75;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <Paper
      elevation={0}
      sx={{
        background: '#ffffff',
        border: '1px solid',
        borderColor: '#f3f4f6',
        borderRadius: 3,
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 2.5,
      }}
    >
      {/* Circular Pie Chart */}
      <Box
        sx={{
          position: 'relative',
          width: 100,
          height: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* SVG Donut Chart */}
        <svg
          width="100"
          height="100"
          viewBox="0 0 100 100"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={softColor.light}
            strokeWidth="10"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={softColor.main}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1s ease-in-out',
            }}
          />
        </svg>

        {/* Center icon */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: softColor.main,
            '& svg': { fontSize: 32 },
          }}
        >
          {icon}
        </Box>
      </Box>

      {/* Value and Label */}
      <Box>
        {isLoading ? (
          <Skeleton width={70} height={36} sx={{ mb: 0.5, mx: 'auto' }} />
        ) : (
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 32,
              lineHeight: 1.2,
              color: '#111827',
              mb: 0.5,
            }}
          >
            {value}
          </Typography>
        )}
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 500,
            color: '#6b7280',
          }}
        >
          {label}
        </Typography>
      </Box>
    </Paper>
  );
}
