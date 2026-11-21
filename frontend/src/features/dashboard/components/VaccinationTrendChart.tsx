import React, { useMemo, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { useChartInView } from '../hooks/useChartInView';
import '../styles/dashboardCharts.css';

export interface DoseTrendData {
  doseLabel: string;
  administered: number;
  scheduled: number;
  rate: number; // percentage
  color: string;
}

interface VaccinationTrendChartProps {
  data?: DoseTrendData[];
  completionRate?: number;
  loading?: boolean;
}

export const VaccinationTrendChart: React.FC<VaccinationTrendChartProps> = ({
  data,
  completionRate = 92.5,
  loading = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const { ref: scrollRef, inView } = useChartInView<HTMLDivElement>({ threshold: 0.2 });

  const defaultDoseData: DoseTrendData[] = useMemo(
    () => [
      { doseLabel: 'Day 0 (Initial Dose)', administered: 320, scheduled: 320, rate: 100, color: '#10b981' },
      { doseLabel: 'Day 3 (2nd Dose)', administered: 308, scheduled: 320, rate: 96.2, color: '#3b82f6' },
      { doseLabel: 'Day 7 (3rd Dose)', administered: 295, scheduled: 320, rate: 92.1, color: '#8b5cf6' },
      { doseLabel: 'Day 14 / 28 (Final)', administered: 278, scheduled: 310, rate: 89.6, color: '#f59e0b' },
    ],
    []
  );

  const doseData = data && data.length > 0 ? data : defaultDoseData;

  const totalAdministered = useMemo(
    () => doseData.reduce((acc, curr) => acc + curr.administered, 0),
    [doseData]
  );

  const adherenceBadge = useMemo(() => {
    if (completionRate >= 90) return { label: 'High Adherence', bg: '#10b981' };
    if (completionRate >= 75) return { label: 'Moderate Adherence', bg: '#f59e0b' };
    return { label: 'Needs Follow-Up', bg: '#ef4444' };
  }, [completionRate]);

  const activeDose = hoveredIdx !== null ? doseData[hoveredIdx] : null;

  return (
    <div
      ref={scrollRef}
      className="abtc-chart-card abtc-scroll-reveal abtc-scroll-watch"
      data-in-view={inView ? 'true' : 'false'}
    >
      {/* Top gradient accent bar */}
      <div
        className="abtc-chart-accent-bar"
        style={{
          background: 'linear-gradient(90deg, transparent, #10b981, #3b82f6, transparent)',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-h, #111827)',
                letterSpacing: '-0.25px',
              }}
            >
              Vaccination Trend
            </h3>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 9px',
                borderRadius: 999,
                background: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.12)',
                color: isDark ? '#34d399' : '#059669',
                border: `1px solid ${isDark ? 'rgba(52, 211, 153, 0.25)' : 'rgba(16, 185, 129, 0.22)'}`,
              }}
            >
              {completionRate}% Completion
            </span>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-secondary, #6b7280)' }}>
            Post-Exposure Prophylaxis (PEP) dose adherence bar chart
          </p>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-h, #111827)' }}>
            {(totalAdministered ?? 0).toLocaleString()}
          </span>
          <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-secondary, #6b7280)' }}>
            Total Doses Given
          </span>
        </div>
      </div>

      {/* Vertical Rising Column Bar Chart */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 220 }}>
        {loading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              alignItems: 'end',
              height: 190,
              padding: '0 12px',
            }}
          >
            {[90, 78, 65, 58].map((h, n) => (
              <div key={n} className="abtc-skeleton-box" style={{ height: `${h}%`, width: '100%' }} />
            ))}
          </div>
        ) : (
          <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {/* Y-axis horizontal guide lines */}
            <div
              style={{
                position: 'relative',
                height: 185,
                display: 'flex',
                alignItems: 'flex-end',
                paddingLeft: 34,
                paddingRight: 8,
              }}
            >
              {[100, 75, 50, 25, 0].map((tick) => (
                <div
                  key={tick}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: `${tick}%`,
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      fontSize: 9.5,
                      fontWeight: 600,
                      color: 'var(--text-secondary, #94a3b8)',
                      textAlign: 'right',
                      paddingRight: 6,
                    }}
                  >
                    {tick}%
                  </span>
                  <div
                    style={{
                      flex: 1,
                      borderBottom:
                        tick === 0
                          ? `1.5px solid ${isDark ? 'rgba(148, 163, 184, 0.28)' : '#cbd5e1'}`
                          : `1px dashed ${isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.28)'}`,
                    }}
                  />
                </div>
              ))}

              {/* Columns */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${doseData.length}, minmax(0, 1fr))`,
                  gap: 16,
                  width: '100%',
                  height: '100%',
                  alignItems: 'end',
                }}
              >
                {doseData.map((d, idx) => {
                  const isActive = hoveredIdx === idx;
                  const isDimmed = hoveredIdx !== null && !isActive;
                  const clampedRate = Math.min(100, Math.max(4, d.rate));
                  const pending = Math.max(0, d.scheduled - d.administered);

                  return (
                    <div
                      key={d.doseLabel}
                      role="button"
                      tabIndex={0}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      onFocus={() => setHoveredIdx(idx)}
                      onBlur={() => setHoveredIdx(null)}
                      aria-label={`${d.doseLabel}: ${d.rate}% (${d.administered} of ${d.scheduled} doses)`}
                      style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        position: 'relative',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      {/* Floating Tooltip on hover */}
                      {isActive && (
                        <div
                          className="abtc-tooltip"
                          style={{
                            position: 'absolute',
                            bottom: `calc(${clampedRate}% + 26px)`,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: isDark ? '#0f172a' : '#1e293b',
                            color: '#ffffff',
                            padding: '6px 10px',
                            borderRadius: 9,
                            fontSize: 10.5,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 8px 18px rgba(15, 23, 42, 0.28)',
                            border: '1px solid rgba(148, 163, 184, 0.25)',
                            zIndex: 10,
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ color: d.color, fontWeight: 800 }}>
                            {d.administered.toLocaleString()} / {d.scheduled.toLocaleString()} doses
                          </div>
                          <div style={{ fontSize: 9.5, color: '#cbd5e1', marginTop: 1 }}>
                            {pending > 0 ? `${pending} pending` : '100% completed'}
                          </div>
                        </div>
                      )}

                      {/* Percentage Label sitting above the rising bar */}
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 800,
                          color: isActive ? d.color : 'var(--text-h, #111827)',
                          marginBottom: 5,
                          transition: 'color 0.2s ease, transform 0.2s ease',
                          transform: isActive ? 'translateY(-2px)' : 'none',
                        }}
                      >
                        {d.rate}%
                      </span>

                      {/* Full-height subtle track + Rising Gradient Bar */}
                      <div
                        style={{
                          width: '100%',
                          maxWidth: 52,
                          height: `calc(${clampedRate}% - 22px)`,
                          minHeight: 16,
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'flex-end',
                        }}
                      >
                        <div
                          className="abtc-bar-rise"
                          style={
                            {
                              width: '100%',
                              height: '100%',
                              borderRadius: '10px 10px 4px 4px',
                              background: `linear-gradient(180deg, ${d.color} 0%, ${d.color}bb 100%)`,
                              boxShadow: isActive
                                ? `0 8px 20px -4px ${d.color}90`
                                : `0 4px 10px -4px ${d.color}45`,
                              opacity: isDimmed ? 0.45 : 1,
                              position: 'relative',
                              overflow: 'hidden',
                              '--bar-delay': `${idx * 100}ms`,
                            } as React.CSSProperties
                          }
                        >
                          {/* Subtle top glossy highlight */}
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: 4,
                              background: 'rgba(255, 255, 255, 0.35)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-Axis Labels */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${doseData.length}, minmax(0, 1fr))`,
                gap: 16,
                paddingLeft: 34,
                paddingRight: 8,
                marginTop: 10,
                textAlign: 'center',
              }}
            >
              {doseData.map((d, idx) => {
                const isActive = hoveredIdx === idx;
                const shortLabel = d.doseLabel.split('(')[0].trim();
                const subLabel = d.doseLabel.match(/\(([^)]+)\)/)?.[1] ?? '';
                return (
                  <div key={d.doseLabel}>
                    <div
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: isActive ? d.color : 'var(--text-h, #111827)',
                        transition: 'color 0.2s ease',
                      }}
                    >
                      {shortLabel}
                    </div>
                    {subLabel && (
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--text-secondary, #6b7280)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {subLabel}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Protocol Compliance Footer (or Active Hover Summary) */}
      <div
        style={{
          marginTop: 14,
          padding: '10px 14px',
          borderRadius: 12,
          background: isDark ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-secondary, #f8fafc)',
          border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.22)' : 'var(--card-border, #e2e8f0)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: activeDose ? `${activeDose.color}22` : 'rgba(16, 185, 129, 0.16)',
              color: activeDose ? activeDose.color : '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-h, #111827)' }}>
              {activeDose ? activeDose.doseLabel : 'Strict Rabies PEP Protocol'}
            </span>
            <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-secondary, #6b7280)' }}>
              {activeDose
                ? `${activeDose.administered.toLocaleString()} administered out of ${activeDose.scheduled.toLocaleString()} scheduled`
                : 'Compliant with Philippine DOH Anti-Rabies Guidelines'}
            </span>
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 999,
            background: adherenceBadge.bg,
            color: '#ffffff',
            whiteSpace: 'nowrap',
          }}
        >
          {adherenceBadge.label}
        </span>
      </div>
    </div>
  );
};
