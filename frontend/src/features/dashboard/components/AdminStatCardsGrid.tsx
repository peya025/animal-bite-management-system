import React from 'react';
import { useTheme } from '@mui/material/styles';

export interface ABTCStatsData {
  totalPatients: number;
  activeBiteCases: number;
  todayQueue: number;
  pendingVaccinations: number;
  completedTreatments: number;
  severeCategory3: number;
  vaccineStockDoses: number;
  newCasesPeriod: number;
}

interface AdminStatCardsGridProps {
  stats: ABTCStatsData;
  loading?: boolean;
}

// Ring constants
const SIZE = 84;
const RADIUS = 34;
const STROKE_W = 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CX = SIZE / 2;
const CY = SIZE / 2;

interface RingCardProps {
  label: string;
  value: number;
  color: string;
  trackColor: string;
  glow: string;
  loading?: boolean;
  total?: number;
}

function RingCard({ label, value, color, trackColor, glow, loading = false, total }: RingCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Determine arc fill
  let rawProgress = 0;
  if (total && total > 0) {
    rawProgress = value / total;
  } else if (value > 0) {
    rawProgress = value >= 100 ? 1 : value / 100;
    if (rawProgress < 0.15) rawProgress = 0.15;
  }
  const clamped = Math.min(Math.max(rawProgress, 0), 1);
  const filled = CIRCUMFERENCE * clamped;
  const unfilled = CIRCUMFERENCE - filled;
  const dashArray = `${filled} ${unfilled}`;

  const valStr = String(value);

  return (
    <div
      style={{
        borderRadius: 20,
        padding: '18px 14px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        minHeight: 148,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...(isDark
          ? {
              background: 'linear-gradient(145deg, #0d1f13 0%, #091610 55%, #060f0b 100%)',
              border: `1.5px solid ${color}48`,
              boxShadow: `0 0 0 1px ${color}10, 0 8px 32px -4px rgba(0,0,0,0.75), 0 0 30px -8px ${glow}`,
            }
          : {
              background: 'radial-gradient(ellipse at 30% 0%, #ecfdf5 0%, #f4fbf7 50%, #ffffff 100%)',
              border: '1.5px solid rgba(16, 185, 129, 0.30)',
              boxShadow: '0 6px 24px -4px rgba(16, 185, 129, 0.15), inset 0 1px 2px rgba(255,255,255,0.9)',
            }),
      }}
    >
      {/* Ring */}
      <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          fill="none"
          style={{ display: 'block' }}
        >
          {/* Track */}
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            stroke={isDark ? trackColor : 'rgba(16, 185, 129, 0.13)'}
            strokeWidth={STROKE_W}
          />
          {/* Arc */}
          {!loading && (
            <circle
              cx={CX}
              cy={CY}
              r={RADIUS}
              stroke={isDark ? color : '#10b981'}
              strokeWidth={STROKE_W}
              strokeDasharray={dashArray}
              strokeLinecap="round"
              transform={`rotate(-90 ${CX} ${CY})`}
              style={{
                filter: isDark
                  ? `drop-shadow(0 0 9px ${glow}) drop-shadow(0 0 3px ${color})`
                  : 'drop-shadow(0 0 5px rgba(16, 185, 129, 0.45))',
                transition: 'stroke-dasharray 0.6s ease',
              }}
            />
          )}
        </svg>
        {/* Centre value */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {loading ? (
            <div style={{ width: 28, height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.1)' }} />
          ) : (
            <span
              style={{
                fontSize: valStr.length > 4 ? 13 : 18,
                fontWeight: 900,
                color: isDark ? '#ffffff' : '#064e3b',
                lineHeight: 1,
                letterSpacing: '-0.5px',
                fontFamily: "'Poppins', sans-serif",
                textShadow: isDark
                  ? `0 0 14px ${glow}60, 0 1px 4px rgba(0,0,0,0.6)`
                  : 'none',
              }}
            >
              {value.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          fontFamily: "'Poppins', sans-serif",
          textAlign: 'center',
          color: isDark ? color : '#047857',
          textShadow: isDark ? `0 0 10px ${glow}` : 'none',
          lineHeight: 1.3,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export const AdminStatCardsGrid: React.FC<AdminStatCardsGridProps> = ({ stats, loading = false }) => {
  const statItems = [
    {
      id: 'total-patients',
      label: 'Total Patients',
      value: stats.totalPatients,
      color: '#00e5a0',
      trackColor: 'rgba(0, 229, 160, 0.14)',
      glow: 'rgba(0, 229, 160, 0.55)',
    },
    {
      id: 'active-cases',
      label: 'Active Bite Cases',
      value: stats.activeBiteCases,
      color: '#f87171',
      trackColor: 'rgba(248, 113, 113, 0.14)',
      glow: 'rgba(248, 113, 113, 0.55)',
    },
    {
      id: 'today-queue',
      label: "Today's Queue",
      value: stats.todayQueue,
      color: '#00e5a0',
      trackColor: 'rgba(0, 229, 160, 0.14)',
      glow: 'rgba(0, 229, 160, 0.55)',
    },
    {
      id: 'pending-vax',
      label: 'Pending Vaccinations',
      value: stats.pendingVaccinations,
      color: '#fbbf24',
      trackColor: 'rgba(251, 191, 36, 0.14)',
      glow: 'rgba(251, 191, 36, 0.55)',
    },
    {
      id: 'completed-treatments',
      label: 'Completed Treatments',
      value: stats.completedTreatments,
      color: '#00e5a0',
      trackColor: 'rgba(0, 229, 160, 0.14)',
      glow: 'rgba(0, 229, 160, 0.55)',
    },
    {
      id: 'severe-cat3',
      label: 'Category III (Severe)',
      value: stats.severeCategory3,
      color: '#f87171',
      trackColor: 'rgba(248, 113, 113, 0.14)',
      glow: 'rgba(248, 113, 113, 0.55)',
    },
    {
      id: 'vaccine-stock',
      label: 'Vaccine Doses in Stock',
      value: stats.vaccineStockDoses,
      color: stats.vaccineStockDoses < 30 ? '#fbbf24' : '#00e5a0',
      trackColor: stats.vaccineStockDoses < 30 ? 'rgba(251, 191, 36, 0.14)' : 'rgba(0, 229, 160, 0.14)',
      glow: stats.vaccineStockDoses < 30 ? 'rgba(251, 191, 36, 0.55)' : 'rgba(0, 229, 160, 0.55)',
    },
    {
      id: 'new-cases-period',
      label: 'New Bite Cases',
      value: stats.newCasesPeriod,
      color: '#38bdf8',
      trackColor: 'rgba(56, 189, 248, 0.14)',
      glow: 'rgba(56, 189, 248, 0.55)',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 16,
        height: '100%',
      }}
      className="admin-stat-grid"
    >
      {statItems.map((item) => (
        <RingCard
          key={item.id}
          label={item.label}
          value={item.value}
          color={item.color}
          trackColor={item.trackColor}
          glow={item.glow}
          loading={loading}
        />
      ))}
    </div>
  );
};
