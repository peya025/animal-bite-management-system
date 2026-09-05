import React, { useMemo } from 'react';

export interface DistributionItem {
  name: string;
  count: number;
  color: string;
  icon?: string;
}

interface CaseDistributionChartProps {
  data?: DistributionItem[];
  loading?: boolean;
}

export const CaseDistributionChart: React.FC<CaseDistributionChartProps> = ({
  data,
  loading = false,
}) => {
  const defaultDistribution: DistributionItem[] = useMemo(
    () => [
      { name: 'Canine (Dog Bites)', count: 320, color: '#3b82f6', icon: '🐕' },
      { name: 'Feline (Cat Scratches/Bites)', count: 114, color: '#10b981', icon: '🐈' },
      { name: 'Other Domestic (Pig, Cow, etc.)', count: 28, color: '#f59e0b', icon: '🐾' },
      { name: 'Wild / Rodents (Bats, Rats)', count: 18, color: '#8b5cf6', icon: '🦇' },
    ],
    []
  );

  const items = data && data.length > 0 ? data : defaultDistribution;
  const total = useMemo(() => items.reduce((acc, curr) => acc + curr.count, 0), [items]);

  // Donut geometry calculations
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute strokeDasharray and strokeDashoffset for each segment
  const segments = useMemo(() => {
    let accumulatedAngle = 0;
    return items.map((item) => {
      const percentage = total > 0 ? item.count / total : 0;
      const strokeLength = percentage * circumference;
      const spaceLength = circumference - strokeLength;
      const offset = -accumulatedAngle;
      accumulatedAngle += strokeLength;

      return {
        ...item,
        percentage: Math.round(percentage * 100),
        strokeDasharray: `${strokeLength} ${spaceLength}`,
        strokeDashoffset: offset,
      };
    });
  }, [items, total, circumference]);

  return (
    <div
      style={{
        background: 'var(--card-bg, #ffffff)',
        borderRadius: 16,
        border: '1px solid var(--card-border, #e5e7eb)',
        padding: '20px 22px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 380,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-h, #111827)',
              letterSpacing: '-0.2px',
            }}
          >
            Case Distribution
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary, #6b7280)' }}>
            Breakdown by biting animal species & vector source
          </p>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 999,
            background: 'var(--bg-secondary, #f3f4f6)',
            color: 'var(--text-secondary, #6b7280)',
          }}
        >
          {items.length} Vectors
        </span>
      </div>

      {/* Main Content: Donut + Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          gap: 16,
          flex: 1,
        }}
      >
        {/* Donut Chart */}
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)' }}>Loading...</span>
            </div>
          ) : (
            <>
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Ring */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="var(--bg-secondary, #f1f5f9)"
                  strokeWidth={strokeWidth}
                />
                {/* Segments */}
                {segments.map((seg, idx) => (
                  <circle
                    key={idx}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    strokeLinecap="butt"
                    style={{ transition: 'all 0.4s ease-out' }}
                  />
                ))}
              </svg>

              {/* Center Info Text */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-h, #111827)', lineHeight: 1 }}>
                  {total.toLocaleString()}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary, #6b7280)', marginTop: 2 }}>
                  Total Cases
                </span>
              </div>
            </>
          )}
        </div>

        {/* Legend List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 180 }}>
          {segments.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: 8,
                background: 'var(--bg-secondary, #f8fafc)',
                border: '1px solid var(--card-border, #f1f5f9)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{item.icon || '🐾'}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-h, #111827)' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary, #6b7280)' }}>
                    {item.count} cases
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: item.color,
                  }}
                >
                  {item.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Note */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: '1px solid var(--card-border, #e5e7eb)',
          fontSize: 11,
          color: 'var(--text-secondary, #6b7280)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ color: '#10b981', fontWeight: 700 }}>●</span>
        <span>Canine (dogs) account for the majority ({segments[0]?.percentage || 67}%) of bite exposures presented.</span>
      </div>
    </div>
  );
};
