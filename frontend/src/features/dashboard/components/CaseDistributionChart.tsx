import React, { useMemo, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { useChartInView } from '../hooks/useChartInView';
import '../styles/dashboardCharts.css';

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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const { ref: scrollRef, inView } = useChartInView<HTMLDivElement>({ threshold: 0.2 });

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

  // Donut geometry
  const size = 192;
  const strokeWidth = 24;
  const radius = (size - strokeWidth - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const gapPx = items.length > 1 ? 3 : 0;

  const segments = useMemo(() => {
    let accumulated = 0;
    return items.map((item) => {
      const ratio = total > 0 ? item.count / total : 0;
      const rawLength = ratio * circumference;
      const strokeLength = Math.max(0, rawLength - gapPx);
      const spaceLength = circumference - strokeLength;
      const offset = -accumulated;
      accumulated += rawLength;

      return {
        ...item,
        percentage: Math.round(ratio * 100),
        strokeDasharray: `${strokeLength} ${spaceLength}`,
        strokeDashoffset: offset,
      };
    });
  }, [items, total, circumference, gapPx]);

  const topSegment = useMemo(() => {
    if (segments.length === 0) return null;
    return [...segments].sort((a, b) => b.count - a.count)[0];
  }, [segments]);

  const activeSegment = activeIndex !== null ? segments[activeIndex] : null;

  return (
    <div
      ref={scrollRef}
      className="abtc-chart-card abtc-scroll-reveal abtc-scroll-watch"
      data-in-view={inView ? 'true' : 'false'}
    >
      {/* Accent bar */}
      <div
        className="abtc-chart-accent-bar"
        style={{
          background: 'linear-gradient(90deg, transparent, #8b5cf6, #3b82f6, transparent)',
        }}
      />

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
              letterSpacing: '-0.25px',
            }}
          >
            Case Distribution
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-secondary, #6b7280)' }}>
            Breakdown by biting animal species &amp; vector source
          </p>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 9px',
            borderRadius: 999,
            background: isDark ? 'rgba(139, 92, 246, 0.18)' : 'rgba(139, 92, 246, 0.1)',
            color: isDark ? '#c4b5fd' : '#7c3aed',
            border: `1px solid ${isDark ? 'rgba(196, 181, 253, 0.25)' : 'rgba(139, 92, 246, 0.2)'}`,
          }}
        >
          {items.length} Vectors
        </span>
      </div>

      {/* Main Content: Animated Donut + Interactive Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          gap: 20,
          flex: 1,
        }}
      >
        {/* Donut Chart */}
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
          {loading ? (
            <div
              className="abtc-skeleton-box"
              style={{ width: size, height: size, borderRadius: '50%' }}
            />
          ) : (
            <>
              <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                role="img"
                aria-label="Case distribution donut chart"
                style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
              >
                {/* Background Track */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9'}
                  strokeWidth={strokeWidth}
                />

                {/* Animated Segments */}
                {segments.map((seg, idx) => {
                  const isActive = activeIndex === idx;
                  const isDimmed = activeIndex !== null && !isActive;
                  return (
                    <circle
                      key={seg.name}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={isActive ? strokeWidth + 5 : strokeWidth}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      strokeLinecap="butt"
                      opacity={isDimmed ? 0.35 : 1}
                      className="abtc-donut-segment"
                      style={
                        {
                          '--seg-dash': seg.strokeDasharray,
                          '--seg-delay': `${idx * 90}ms`,
                          filter: isActive ? `drop-shadow(0 0 8px ${seg.color}80)` : 'none',
                        } as React.CSSProperties
                      }
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseLeave={() => setActiveIndex(null)}
                    />
                  );
                })}
              </svg>

              {/* Dynamic Center Readout */}
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
                  padding: '0 22px',
                }}
              >
                <span
                  style={{
                    fontSize: activeSegment ? 24 : 22,
                    fontWeight: 800,
                    color: activeSegment ? activeSegment.color : 'var(--text-h, #111827)',
                    lineHeight: 1.05,
                    transition: 'color 0.2s ease',
                  }}
                >
                  {activeSegment
                    ? `${activeSegment.percentage}%`
                    : (total ?? 0).toLocaleString()}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-secondary, #6b7280)',
                    marginTop: 4,
                    maxWidth: 110,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {activeSegment ? activeSegment.name.split('(')[0].trim() : 'Total Cases'}
                </span>
                {activeSegment && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: 'var(--text-secondary, #94a3b8)',
                      marginTop: 1,
                    }}
                  >
                    {activeSegment.count.toLocaleString()} cases
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Interactive Legend List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1, minWidth: 195 }}>
          {loading
            ? [0, 1, 2, 3].map((n) => (
                <div key={n} className="abtc-skeleton-box" style={{ height: 48, width: '100%' }} />
              ))
            : segments.map((item, idx) => {
                const isActive = activeIndex === idx;
                return (
                  <div
                    key={item.name}
                    role="button"
                    tabIndex={0}
                    data-active={isActive ? 'true' : 'false'}
                    className="abtc-interactive-row"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onFocus={() => setActiveIndex(idx)}
                    onBlur={() => setActiveIndex(null)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      padding: '8px 11px',
                      borderRadius: 11,
                      background: isActive
                        ? isDark
                          ? 'rgba(255, 255, 255, 0.07)'
                          : `${item.color}0d`
                        : isDark
                          ? 'rgba(255, 255, 255, 0.03)'
                          : 'var(--bg-secondary, #f8fafc)',
                      border: `1px solid ${
                        isActive ? `${item.color}66` : 'var(--card-border, #f1f5f9)'
                      }`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: '50%',
                            background: item.color,
                            boxShadow: isActive ? `0 0 8px ${item.color}` : 'none',
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--text-h, #111827)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary, #6b7280)' }}>
                          {item.count.toLocaleString()}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>
                          {item.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Mini animated progress bar */}
                    <div
                      style={{
                        height: 4,
                        borderRadius: 999,
                        background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        className="abtc-bar-fill"
                        style={
                          {
                            height: '100%',
                            width: `${item.percentage}%`,
                            borderRadius: 999,
                            background: item.color,
                            '--bar-delay': `${120 + idx * 80}ms`,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Dynamic Footer Insight */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: '1px solid var(--card-border, #e5e7eb)',
          fontSize: 11.5,
          color: 'var(--text-secondary, #6b7280)',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: topSegment?.color || '#10b981',
            flexShrink: 0,
          }}
        />
        <span>
          <strong style={{ color: 'var(--text-h, #111827)' }}>
            {topSegment?.name || 'Canine (Dog Bites)'}
          </strong>{' '}
          account for the largest share ({topSegment?.percentage ?? 0}%) of recorded exposures.
        </span>
      </div>
    </div>
  );
};
