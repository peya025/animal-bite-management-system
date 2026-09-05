import React, { useMemo } from 'react';

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

  const totalAdministered = useMemo(() => {
    return doseData.reduce((acc, curr) => acc + curr.administered, 0);
  }, [doseData]);

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
              Vaccination Trend
            </h3>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#059669',
              }}
            >
              {completionRate}% Completion
            </span>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary, #6b7280)' }}>
            Post-Exposure Prophylaxis (PEP) dose progression tracking
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-h, #111827)' }}>
            {totalAdministered.toLocaleString()}
          </span>
          <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-secondary, #6b7280)' }}>
            Total Doses Given
          </span>
        </div>
      </div>

      {/* Main Bar Chart / Dose Progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, justifyContent: 'center' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)' }}>Loading vaccination stats...</span>
          </div>
        ) : (
          doseData.map((d, idx) => (
            <div key={idx}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: d.color,
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-h, #111827)' }}>
                    {d.doseLabel}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--text-secondary, #6b7280)' }}>
                    {d.administered} / {d.scheduled} doses
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: d.color }}>
                    {d.rate}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  height: 9,
                  borderRadius: 999,
                  background: 'var(--bg-secondary, #f1f5f9)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, Math.max(0, d.rate))}%`,
                    background: d.color,
                    borderRadius: 999,
                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Protocol Compliance Card */}
      <div
        style={{
          marginTop: 14,
          padding: '10px 14px',
          borderRadius: 10,
          background: 'var(--bg-secondary, #f8fafc)',
          border: '1px solid var(--card-border, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-h, #111827)' }}>
              Strict Rabies PEP Protocol
            </span>
            <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-secondary, #6b7280)' }}>
              Compliant with Philippine DOH Anti-Rabies Guidelines
            </span>
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 6,
            background: '#10b981',
            color: '#ffffff',
          }}
        >
          High Adherence
        </span>
      </div>
    </div>
  );
};
