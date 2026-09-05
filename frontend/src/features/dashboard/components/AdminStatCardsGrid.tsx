import React from 'react';

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

export const AdminStatCardsGrid: React.FC<AdminStatCardsGridProps> = ({ stats, loading = false }) => {
  const statItems = [
    {
      id: 'total-patients',
      label: 'Total Patients',
      value: stats.totalPatients,
      subtitle: 'Registered in ABTC',
      change: '+12% this month',
      changeType: 'positive' as const,
      color: '#3b82f6', // Blue
      bgLight: 'rgba(59, 130, 246, 0.1)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: 'active-cases',
      label: 'Active Bite Cases',
      value: stats.activeBiteCases,
      subtitle: 'Ongoing protocol',
      change: 'Active PEP',
      changeType: 'neutral' as const,
      color: '#ef4444', // Red
      bgLight: 'rgba(239, 68, 68, 0.1)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
    {
      id: 'today-queue',
      label: "Today's Queue",
      value: stats.todayQueue,
      subtitle: 'Patients in clinic',
      change: 'Live triage',
      changeType: 'neutral' as const,
      color: '#10b981', // Emerald
      bgLight: 'rgba(16, 185, 129, 0.1)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
    },
    {
      id: 'pending-vax',
      label: 'Pending Vaccinations',
      value: stats.pendingVaccinations,
      subtitle: 'Scheduled doses',
      change: 'Follow-up due',
      changeType: 'warning' as const,
      color: '#f59e0b', // Amber
      bgLight: 'rgba(245, 158, 11, 0.1)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 3l3 3" />
          <path d="M14 7l3 3" />
          <path d="M10.5 10.5l6 6" />
          <path d="M15 6l3 3-9 9H6v-3l9-9z" />
          <path d="M3 21l3-3" />
        </svg>
      ),
    },
    {
      id: 'completed-treatments',
      label: 'Completed Treatments',
      value: stats.completedTreatments,
      subtitle: 'Full course finished',
      change: '98.5% success',
      changeType: 'positive' as const,
      color: '#059669', // Dark emerald
      bgLight: 'rgba(5, 150, 105, 0.1)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      id: 'severe-cat3',
      label: 'Category III (Severe)',
      value: stats.severeCategory3,
      subtitle: 'Transdermal bites',
      change: 'High Priority',
      changeType: 'danger' as const,
      color: '#dc2626', // Crimson
      bgLight: 'rgba(220, 38, 38, 0.1)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    {
      id: 'vaccine-stock',
      label: 'Vaccine Doses in Stock',
      value: stats.vaccineStockDoses,
      subtitle: 'Anti-rabies / RIG vials',
      change: stats.vaccineStockDoses < 30 ? 'Low Stock' : 'Good Reserve',
      changeType: stats.vaccineStockDoses < 30 ? ('warning' as const) : ('positive' as const),
      color: '#8b5cf6', // Violet
      bgLight: 'rgba(139, 92, 246, 0.1)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 2h6" />
          <path d="M10 2v2.5h4V2" />
          <rect x="5.5" y="4.5" width="13" height="16.5" rx="3" />
          <path d="M12 8.5v6" />
          <path d="M9 11.5h6" />
          <path d="M5.5 17h13" />
        </svg>
      ),
    },
    {
      id: 'new-cases-period',
      label: 'New Bite Cases',
      value: stats.newCasesPeriod,
      subtitle: 'Reported this period',
      change: '+4 new today',
      changeType: 'neutral' as const,
      color: '#0ea5e9', // Sky Blue
      bgLight: 'rgba(14, 165, 233, 0.1)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 14,
        height: '100%',
      }}
      className="admin-stat-grid"
    >
      {statItems.map((item) => (
        <div
          key={item.id}
          style={{
            background: 'var(--card-bg, #ffffff)',
            borderRadius: 14,
            border: '1px solid var(--card-border, #e5e7eb)',
            padding: '16px 16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
          }}
          className="admin-stat-card"
        >
          {/* Top row: icon + badge */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: item.bgLight,
                color: item.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: 999,
                background:
                  item.changeType === 'positive'
                    ? 'rgba(16, 185, 129, 0.12)'
                    : item.changeType === 'warning'
                    ? 'rgba(245, 158, 11, 0.12)'
                    : item.changeType === 'danger'
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'var(--bg-secondary, #f3f4f6)',
                color:
                  item.changeType === 'positive'
                    ? '#059669'
                    : item.changeType === 'warning'
                    ? '#d97706'
                    : item.changeType === 'danger'
                    ? '#dc2626'
                    : 'var(--text-secondary, #6b7280)',
                whiteSpace: 'nowrap',
              }}
            >
              {item.change}
            </span>
          </div>

          {/* Metric value and title */}
          <div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--text-h, #111827)',
                lineHeight: 1.1,
                letterSpacing: '-0.3px',
                marginBottom: 4,
              }}
            >
              {loading ? '—' : item.value.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--text, #374151)',
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-secondary, #9ca3af)',
                marginTop: 2,
              }}
            >
              {item.subtitle}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
