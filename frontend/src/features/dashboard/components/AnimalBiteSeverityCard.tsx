import React, { useMemo } from 'react';

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
      bgLight: 'rgba(16, 185, 129, 0.1)',
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
      bgLight: 'rgba(245, 158, 11, 0.1)',
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
      bgLight: 'rgba(239, 68, 68, 0.1)',
      badge: 'High Priority',
      treatment: 'ARV + Rabies Immunoglobulin (RIG)',
    },
  ];

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-h, #111827)',
                letterSpacing: '-0.2px',
              }}
            >
              Animal Bite Severity
            </h3>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#dc2626',
              }}
            >
              WHO & DOH Tri-Level
            </span>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary, #6b7280)' }}>
            Exposure severity stratification and clinical triage response
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-h, #111827)' }}>
            {totalCases.toLocaleString()}
          </span>
          <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-secondary, #6b7280)' }}>
            Total Classified
          </span>
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)' }}>Loading severity data...</span>
          </div>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              style={{
                borderRadius: 12,
                border: '1px solid var(--card-border, #e5e7eb)',
                background: 'var(--bg-secondary, #f8fafc)',
                padding: '12px 14px',
              }}
            >
              {/* Top Row: Title, Badge, Count */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: cat.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h, #111827)' }}>
                    {cat.title}
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: cat.bgLight,
                      color: cat.color,
                    }}
                  >
                    {cat.badge}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-h, #111827)' }}>
                    {cat.count} cases
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: cat.color }}>
                    ({cat.percent}%)
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  height: 7,
                  borderRadius: 999,
                  background: 'var(--card-border, #e2e8f0)',
                  overflow: 'hidden',
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${cat.percent}%`,
                    background: cat.color,
                    borderRadius: 999,
                    transition: 'width 0.5s ease-out',
                  }}
                />
              </div>

              {/* Clinical Protocol Guidance */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: 'var(--text-secondary, #6b7280)', fontStyle: 'italic' }}>
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
