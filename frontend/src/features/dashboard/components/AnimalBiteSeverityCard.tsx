import React, { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';

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

  const categories = [
    {
      id: 'cat1',
      title: 'Category I (Minor Exposure)',
      description: 'Licking intact skin, touching/feeding animals',
      count: activeStats.category1,
      percent: Math.round((activeStats.category1 / totalCases) * 100),
      color: '#10b981',
      bgLight: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
      badge: 'Low Risk',
      treatment: 'Wound washing only',
    },
    {
      id: 'cat2',
      title: 'Category II (Moderate Exposure)',
      description: 'Minor scratches, abrasions without bleeding, nibbling',
      count: activeStats.category2,
      percent: Math.round((activeStats.category2 / totalCases) * 100),
      color: '#f59e0b',
      bgLight: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
      badge: 'Moderate Risk',
      treatment: 'Immediate ARV Required',
    },
    {
      id: 'cat3',
      title: 'Category III (Severe Exposure)',
      description: 'Transdermal bites, deep punctures, bleeding, mucous exposure',
      count: activeStats.category3,
      percent: Math.round((activeStats.category3 / totalCases) * 100),
      color: '#ef4444',
      bgLight: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
      badge: 'High Priority',
      treatment: 'ARV + Rabies Immunoglobulin (RIG)',
    },
  ];

  return (
    <div
      style={{
        background: isDark
          ? 'var(--card-bg)'
          : 'radial-gradient(ellipse at 30% 0%, #ecfdf5 0%, #f4fbf7 45%, #ffffff 100%)',
        borderRadius: 20,
        border: isDark ? '1px solid var(--border-glow)' : '1px solid rgba(16, 185, 129, 0.32)',
        padding: '22px 24px',
        boxShadow: isDark
          ? 'var(--card-shadow)'
          : '0 8px 24px -4px rgba(16, 185, 129, 0.15), 0 0 18px -3px rgba(132, 204, 22, 0.15), inset 0 1px 2px 0 rgba(255, 255, 255, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 380,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Ambient glow decorative highlight */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: isDark
            ? 'linear-gradient(90deg, transparent, #10b981, transparent)'
            : 'linear-gradient(90deg, transparent, #10b981, transparent)',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: isDark ? '#ffffff' : '#0f172a',
                letterSpacing: '-0.2px',
              }}
            >
              Animal Bite Severity
            </h3>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
                background: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${isDark ? 'rgba(248, 113, 113, 0.35)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: isDark ? '#f87171' : '#dc2626',
              }}
            >
              WHO & DOH Tri-Level
            </span>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: isDark ? '#a7f3d0' : '#047857' }}>
            Exposure severity stratification & clinical triage response
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: isDark ? '#ffffff' : '#0f172a' }}>
            {totalCases.toLocaleString()}
          </span>
          <span style={{ display: 'block', fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>
            Total Classified
          </span>
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <span style={{ fontSize: 12, color: isDark ? '#a7f3d0' : '#047857' }}>Loading severity data...</span>
          </div>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              style={{
                borderRadius: 14,
                border: isDark ? '1px solid rgba(52, 211, 153, 0.16)' : '1px solid rgba(16, 185, 129, 0.2)',
                background: isDark ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.8)',
                padding: '12px 16px',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Top Row: Title, Badge, Count */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
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
                  <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#ffffff' : '#1e293b' }}>
                    {cat.title}
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: cat.bgLight,
                      border: `1px solid ${cat.color}50`,
                      color: cat.color,
                    }}
                  >
                    {cat.badge}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: isDark ? '#ffffff' : '#1e293b' }}>
                    {cat.count} cases
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: cat.color }}>
                    ({cat.percent}%)
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  overflow: 'hidden',
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${cat.percent}%`,
                    background: cat.color,
                    boxShadow: `0 0 8px ${cat.color}`,
                    borderRadius: 999,
                    transition: 'width 0.5s ease-out',
                  }}
                />
              </div>

              {/* Clinical Protocol Guidance */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontStyle: 'italic' }}>
                  {cat.description}
                </span>
                <span style={{ fontWeight: 600, color: cat.color }}>
                  {cat.treatment}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

