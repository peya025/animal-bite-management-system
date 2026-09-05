import React from 'react';

export interface DashboardFilterState {
  role: string;
  status: string;
  dateRange: string;
  customDateFrom?: string;
  customDateTo?: string;
  patientQuery: string;
  caseCategory: string;
}

interface AdminFiltersSectionProps {
  filters: DashboardFilterState;
  onFilterChange: (updated: Partial<DashboardFilterState>) => void;
  onResetFilters: () => void;
  onApplyFilters?: () => void;
}

export const AdminFiltersSection: React.FC<AdminFiltersSectionProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  onApplyFilters,
}) => {
  const activeFilterCount = [
    filters.role !== 'ALL',
    filters.status !== 'ALL',
    filters.dateRange !== 'this_month',
    filters.patientQuery.trim() !== '',
    filters.caseCategory !== 'ALL',
  ].filter(Boolean).length;

  const selectStyle: React.CSSProperties = {
    fontSize: 13,
    padding: '8px 32px 8px 12px',
    borderRadius: 8,
    border: '1px solid var(--input-border, #d1d5db)',
    outline: 'none',
    fontFamily: 'inherit',
    background: 'var(--input-bg, #ffffff) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b7280\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E") no-repeat right 10px center',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    cursor: 'pointer',
    color: 'var(--input-text, #111827)',
    width: '100%',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
    transition: 'all 0.15s ease-in-out',
  };

  const inputStyle: React.CSSProperties = {
    fontSize: 13,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--input-border, #d1d5db)',
    outline: 'none',
    fontFamily: 'inherit',
    background: 'var(--input-bg, #ffffff)',
    color: 'var(--input-text, #111827)',
    width: '100%',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
    transition: 'all 0.15s ease-in-out',
  };

  return (
    <div
      style={{
        background: 'var(--card-bg, #ffffff)',
        borderRadius: 14,
        border: '1px solid var(--card-border, #e5e7eb)',
        padding: '16px 20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
        marginBottom: 24,
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </div>
          <div>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-h, #111827)' }}>
              Operational & Clinical Filters
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--text-secondary, #6b7280)', marginLeft: 8 }}>
              (Role / Status / Date Range / Patient / Cases)
            </span>
          </div>
        </div>

        {/* Right actions: active count + reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activeFilterCount > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 999,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#059669',
              }}
            >
              {activeFilterCount} active {activeFilterCount === 1 ? 'filter' : 'filters'}
            </span>
          )}
          <button
            type="button"
            onClick={onResetFilters}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--card-border, #e5e7eb)',
              background: 'var(--bg-secondary, #f9fafb)',
              color: 'var(--text-secondary, #6b7280)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reset
          </button>
        </div>
      </div>

      {/* Grid of 5 filters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: 12,
          alignItems: 'flex-end',
        }}
        className="admin-filters-grid"
      >
        {/* 1. Role */}
        <div>
          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary, #6b7280)', marginBottom: 5 }}>
            Role
          </label>
          <select
            value={filters.role}
            onChange={(e) => onFilterChange({ role: e.target.value })}
            style={selectStyle}
          >
            <option value="ALL">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="triage">Triage / Doctor</option>
            <option value="treatment">Treatment Staff</option>
            <option value="registration">Registration Staff</option>
          </select>
        </div>

        {/* 2. Status */}
        <div>
          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary, #6b7280)', marginBottom: 5 }}>
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            style={selectStyle}
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active / Ongoing</option>
            <option value="completed">Completed Treatment</option>
            <option value="pending">Pending Vaccination</option>
            <option value="queue">Waiting in Queue</option>
          </select>
        </div>

        {/* 3. Date Range */}
        <div>
          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary, #6b7280)', marginBottom: 5 }}>
            Date Range
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => onFilterChange({ dateRange: e.target.value })}
            style={selectStyle}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="custom">Custom Range...</option>
          </select>
        </div>

        {/* 4. Patient Search */}
        <div>
          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary, #6b7280)', marginBottom: 5 }}>
            Patient
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search patient name..."
              value={filters.patientQuery}
              onChange={(e) => onFilterChange({ patientQuery: e.target.value })}
              style={{ ...inputStyle, paddingLeft: 28 }}
            />
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2.5"
              style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        {/* 5. Case (Category / Severity) */}
        <div>
          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary, #6b7280)', marginBottom: 5 }}>
            Case / Severity
          </label>
          <select
            value={filters.caseCategory}
            onChange={(e) => onFilterChange({ caseCategory: e.target.value })}
            style={selectStyle}
          >
            <option value="ALL">All Bite Cases</option>
            <option value="cat1">Category I (Minor Exposure)</option>
            <option value="cat2">Category II (Moderate Exposure)</option>
            <option value="cat3">Category III (Severe Exposure)</option>
            <option value="dog">Dog Bites</option>
            <option value="cat">Cat Scratches / Bites</option>
            <option value="other">Other Animals</option>
          </select>
        </div>
      </div>

      {/* Optional Custom Date Range Sub-Row */}
      {filters.dateRange === 'custom' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px dashed var(--card-border, #e5e7eb)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #6b7280)' }}>From:</span>
            <input
              type="date"
              value={filters.customDateFrom || ''}
              onChange={(e) => onFilterChange({ customDateFrom: e.target.value })}
              style={{ ...inputStyle, width: 'auto' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #6b7280)' }}>To:</span>
            <input
              type="date"
              value={filters.customDateTo || ''}
              onChange={(e) => onFilterChange({ customDateTo: e.target.value })}
              style={{ ...inputStyle, width: 'auto' }}
            />
          </div>
          {onApplyFilters && (
            <button
              type="button"
              onClick={onApplyFilters}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '7px 14px',
                borderRadius: 6,
                border: 'none',
                background: '#10b981',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Apply Dates
            </button>
          )}
        </div>
      )}
    </div>
  );
};
