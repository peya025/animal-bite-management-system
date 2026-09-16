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

export const AdminStatCardsGrid: React.FC<AdminStatCardsGridProps> = ({ stats, loading = false }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const statItems = [
    {
      id: 'total-patients',
      label: 'Total Patients',
      value: stats.totalPatients,
      subtitle: 'Registered in ABTC',
      change: '+12% this month',
      changeType: 'positive' as const,
      color: '#10b981', // Primary emerald
      bgLight: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)',
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
      bgLight: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.12)',
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
      changeType: 'positive' as const,
      color: '#10b981', // Emerald
      bgLight: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)',
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
      bgLight: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.12)',
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
      color: '#10b981', // Emerald
      bgLight: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)',
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
      bgLight: isDark ? 'rgba(220, 38, 38, 0.2)' : 'rgba(220, 38, 38, 0.12)',
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
      color: '#10b981', // Emerald
      bgLight: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)',
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
      bgLight: isDark ? 'rgba(14, 165, 233, 0.2)' : 'rgba(14, 165, 233, 0.12)',
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
        gap: 16,
        height: '100%',
      }}
      className="admin-stat-grid"
    >
      {statItems.map((item) => (
        <div
          key={item.id}
          style={{
            background: isDark
              ? 'var(--card-bg)'
              : 'radial-gradient(ellipse at 30% 0%, #ecfdf5 0%, #f4fbf7 45%, #ffffff 100%)',
            borderRadius: 20,
            border: isDark ? '1px solid var(--border-glow)' : '1px solid rgba(16, 185, 129, 0.32)',
            padding: '16px 18px',
            boxShadow: isDark
              ? 'var(--card-shadow)'
              : '0 8px 24px -4px rgba(16, 185, 129, 0.15), 0 0 18px -3px rgba(132, 204, 22, 0.15), inset 0 1px 2px 0 rgba(255, 255, 255, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
          }}
          className="admin-stat-card"
        >
          {/* Top row: icon + badge */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: item.bgLight,
                color: item.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: `1px solid ${item.color}40`,
                boxShadow: `0 0 12px ${item.color}25`,
              }}
            >
              {item.icon}
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 999,
                background:
                  item.changeType === 'positive'
                    ? isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.14)'
                    : item.changeType === 'warning'
                    ? isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.14)'
                    : item.changeType === 'danger'
                    ? isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.14)'
                    : isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                color:
                  item.changeType === 'positive'
                    ? isDark ? '#34d399' : '#059669'
                    : item.changeType === 'warning'
                    ? isDark ? '#fbbf24' : '#d97706'
                    : item.changeType === 'danger'
                    ? isDark ? '#f87171' : '#dc2626'
                    : isDark ? '#a7f3d0' : '#475569',
                border: `1px solid ${
                  item.changeType === 'positive'
                    ? '#10b98150'
                    : item.changeType === 'warning'
                    ? '#f59e0b50'
                    : item.changeType === 'danger'
                    ? '#ef444450'
                    : isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1'
                }`,
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
                fontSize: 24,
                fontWeight: 800,
                color: isDark ? '#ffffff' : '#064e3b',
                lineHeight: 1.1,
                letterSpacing: '-0.3px',
                marginBottom: 4,
                textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              {loading ? '—' : item.value.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: isDark ? '#a7f3d0' : '#047857',
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontSize: 11,
                color: isDark ? '#94a3b8' : '#64748b',
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

