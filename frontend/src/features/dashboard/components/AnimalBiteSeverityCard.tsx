import React, { useMemo, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { useChartInView } from '../hooks/useChartInView';
import '../styles/dashboardCharts.css';

export interface SeverityStats {
  category1: number; // Minor
  category2: number; // Moderate
  category3: number; // Severe
}

interface AnimalBiteSeverityCardProps {
  stats?: SeverityStats;
  loading?: boolean;
}

export const AnimalBiteSeverityCard: React.FC<AnimalBiteSeverityCardProps> = ({
  stats,
  loading = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [activeId, setActiveId] = useState<string | null>(null);
  const { ref: scrollRef, inView } = useChartInView<HTMLDivElement>({ threshold: 0.2 });

  const defaultStats: SeverityStats = useMemo(
    () => ({
      category1: 68,
      category2: 245,
      category3: 159,
    }),
    []
  );

  const activeStats = stats || defaultStats;
  const totalCases = activeStats.category1 + activeStats.category2 + activeStats.category3 || 1;

  const categories = useMemo(
    () => [
      {
        id: 'cat1',
        short: 'Cat I',
        title: 'Category I (Minor Exposure)',
        description: 'Licking intact skin, touching/feeding animals',
        count: activeStats.category1,
        percent: Math.round((activeStats.category1 / totalCases) * 100),
        color: '#10b981',
        bgLight: isDark ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.1)',
        badge: 'Low Risk',
        treatment: 'Wound washing only',
      },
      {
        id: 'cat2',
        short: 'Cat II',
        title: 'Category II (Moderate Exposure)',
        description: 'Minor scratches, abrasions without bleeding, nibbling',
        count: activeStats.category2,
        percent: Math.round((activeStats.category2 / totalCases) * 100),
        color: '#f59e0b',
        bgLight: isDark ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.1)',
        badge: 'Moderate Risk',
        treatment: 'Immediate ARV Required',
      },
      {
        id: 'cat3',
        short: 'Cat III',
        title: 'Category III (Severe Exposure)',
        description: 'Transdermal bites, deep punctures, bleeding, mucous exposure',
        count: activeStats.category3,
        percent: Math.round((activeStats.category3 / totalCases) * 100),
        color: '#ef4444',
        bgLight: isDark ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.1)',
        badge: 'High Priority',
        treatment: 'ARV + RIG Required',
      },
    ],
    [activeStats, totalCases, isDark]
  );

  return (
    <div
      ref={scrollRef}
      className="abtc-chart-card abtc-scroll-reveal abtc-scroll-watch"
      data-in-view={inView ? 'true' : 'false'}
    >
      {/* Ambient top accent */}
      <div
        className="abtc-chart-accent-bar"
        style={{
          background: 'linear-gradient(90deg, transparent, #10b981, #f59e0b, #ef4444, transparent)',
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
              Animal Bite Severity
            </h3>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 9px',
                borderRadius: 999,
                background: isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${isDark ? 'rgba(248, 113, 113, 0.3)' : 'rgba(239, 68, 68, 0.25)'}`,
                color: isDark ? '#f87171' : '#dc2626',
              }}
            >
              WHO &amp; DOH Tri-Level
            </span>
          </div>
          <p
            style={{
              margin: '3px 0 0',
              fontSize: 12,
              color: isDark ? '#a7f3d0' : '#047857',
            }}
          >
            Exposure severity stratification &amp; clinical triage response
          </p>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-h, #111827)' }}>
            {(totalCases ?? 0).toLocaleString()}
          </span>
          <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-secondary, #64748b)' }}>
            Total Classified
          </span>
        </div>
      </div>

      {/* Tri-Color Animated Stacked Distribution Bar */}
      {!loading && (
        <div style={{ marginBottom: 14 }}>
          <div
            role="img"
            aria-label="Category I, II, III proportional severity bar"
            style={{
              display: 'flex',
              height: 11,
              borderRadius: 999,
              overflow: 'hidden',
              gap: 3,
              background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)',
              padding: 2,
            }}
          >
            {categories.map((cat, idx) => {
              const isSelected = activeId === cat.id;
              const isDimmed = activeId !== null && !isSelected;
              return (
                <div
                  key={cat.id}
                  onMouseEnter={() => setActiveId(cat.id)}
                  onMouseLeave={() => setActiveId(null)}
                  title={`${cat.short}: ${cat.count} cases (${cat.percent}%)`}
                  className="abtc-stacked-seg"
                  style={
                    {
                      flexGrow: Math.max(cat.percent, 2),
                      background: `linear-gradient(90deg, ${cat.color}dd, ${cat.color})`,
                      borderRadius: 999,
                      opacity: isDimmed ? 0.35 : 1,
                      filter: isSelected ? `drop-shadow(0 0 6px ${cat.color})` : 'none',
                      cursor: 'pointer',
                      '--bar-delay': `${idx * 90}ms`,
                    } as React.CSSProperties
                  }
                />
              );
            })}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 5,
              fontSize: 10.5,
              fontWeight: 600,
              color: 'var(--text-secondary, #6b7280)',
            }}
          >
            {categories.map((cat) => (
              <span
                key={cat.id}
                style={{
                  color: activeId === cat.id ? cat.color : undefined,
                  transition: 'color 0.2s ease',
                }}
              >
                {cat.short}: {cat.percent}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Category Breakdown Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center' }}>
        {loading ? (
          [0, 1, 2].map((n) => (
            <div key={n} className="abtc-skeleton-box" style={{ height: 74, width: '100%' }} />
          ))
        ) : (
          categories.map((cat, idx) => {
            const isSelected = activeId === cat.id;
            return (
              <div
                key={cat.id}
                role="button"
                tabIndex={0}
                data-active={isSelected ? 'true' : 'false'}
                className="abtc-severity-item"
                onMouseEnter={() => setActiveId(cat.id)}
                onMouseLeave={() => setActiveId(null)}
                onFocus={() => setActiveId(cat.id)}
                onBlur={() => setActiveId(null)}
                style={
                  {
                    borderRadius: 14,
                    border: `1px solid ${
                      isSelected
                        ? `${cat.color}75`
                        : isDark
                          ? 'rgba(148, 163, 184, 0.14)'
                          : 'rgba(15, 23, 42, 0.08)'
                    }`,
                    background: isSelected
                      ? isDark
                        ? `${cat.color}16`
                        : `${cat.color}0a`
                      : isDark
                        ? 'rgba(255, 255, 255, 0.025)'
                        : 'var(--bg-secondary, #f8fafc)',
                    boxShadow: isSelected ? `0 6px 18px -6px ${cat.color}40` : 'none',
                    padding: '11px 14px',
                    '--row-delay': `${idx * 90}ms`,
                  } as React.CSSProperties
                }
              >
                {/* Top Row: Title, Badge, Count */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: cat.color,
                        boxShadow: `0 0 8px ${cat.color}`,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-h, #1e293b)' }}>
                      {cat.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 999,
                        background: cat.bgLight,
                        border: `1px solid ${cat.color}45`,
                        color: cat.color,
                      }}
                    >
                      {cat.badge}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-h, #1e293b)' }}>
                      {cat.count.toLocaleString()} cases
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: cat.color }}>
                      ({cat.percent}%)
                    </span>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div
                  style={{
                    height: 6,
                    borderRadius: 999,
                    background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.07)',
                    overflow: 'hidden',
                    marginBottom: 7,
                  }}
                >
                  <div
                    className="abtc-bar-fill"
                    style={
                      {
                        height: '100%',
                        width: `${cat.percent}%`,
                        background: `linear-gradient(90deg, ${cat.color}cc, ${cat.color})`,
                        boxShadow: isSelected ? `0 0 8px ${cat.color}` : 'none',
                        borderRadius: 999,
                        '--bar-delay': `${150 + idx * 100}ms`,
                      } as React.CSSProperties
                    }
                  />
                </div>

                {/* Clinical Protocol Guidance */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: 'var(--text-secondary, #64748b)' }}>
                    {cat.description}
                  </span>
                  <span style={{ fontWeight: 700, color: cat.color, whiteSpace: 'nowrap' }}>
                    {cat.treatment}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
