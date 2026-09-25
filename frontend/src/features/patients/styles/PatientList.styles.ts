import { styled } from '@mui/material/styles';

export const PatientListRoot = styled('div')`
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--text);

  .pm-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); }
  .pm-breadcrumb-link {
    background: none; border: none; color: #3b82f6; font-size: 13px;
    font-family: inherit; cursor: pointer; padding: 0; transition: color 0.15s;
  }
  .pm-breadcrumb-link:hover { color: #2563eb; text-decoration: underline; }
  .pm-breadcrumb-sep { color: var(--card-border); }
  .pm-layout {
    display: flex; flex-direction: column; gap: 20px; width: 100%;
  }
  .pm-main-panel {
    background: var(--card-bg-solid, #ffffff);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-glow, #e2e8f0);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  [data-theme='dark'] & .pm-main-panel,
  [data-theme='dark'] .pm-main-panel {
    background: #111827 !important;
    border-color: rgba(16, 185, 129, 0.25) !important;
  }
  .pm-panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
  }
  .pm-title {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-h);
    margin: 0 0 4px;
    letter-spacing: -0.4px;
    line-height: 1.2;
  }
  .pm-subtitle { font-size: 13px; color: var(--text-secondary); margin: 0; }
  
  /* Unified Filter Tabs */
  .pm-tabs {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
    margin-top: 14px;
    margin-bottom: 0px;
    width: 100%;
    box-sizing: border-box;
  }
  .pm-tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 10px;
    border: 1px solid var(--border-glow, #e2e8f0);
    background: var(--card-bg-solid, #ffffff);
    color: var(--text, #334155);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .pm-tab-btn:hover {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    border-color: #059669 !important;
    color: #ffffff !important;
    font-weight: 700 !important;
    box-shadow: 0 3px 12px rgba(16, 185, 129, 0.38), 0 1px 3px rgba(0, 0, 0, 0.08) !important;
    transform: translateY(-1px);
  }
  .pm-tab-btn:hover .pm-tab-badge {
    background: rgba(255, 255, 255, 0.28) !important;
    color: #ffffff !important;
    border-color: rgba(255, 255, 255, 0.4) !important;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12);
  }
  .pm-tab-btn--active {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    border-color: #059669 !important;
    color: #ffffff !important;
    font-weight: 700 !important;
    box-shadow: 0 3px 12px rgba(16, 185, 129, 0.38), 0 1px 3px rgba(0, 0, 0, 0.08) !important;
    transform: translateY(-1px);
  }
  .pm-tab-btn--active:hover {
    background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
    border-color: #047857 !important;
    color: #ffffff !important;
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.45), 0 2px 4px rgba(0, 0, 0, 0.1) !important;
  }
  .pm-tab-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 750;
    background: #f1f5f9;
    color: #475569;
    border: 1px solid var(--border-glow, #e2e8f0);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-sizing: border-box;
    line-height: 1;
  }
  .pm-tab-btn--active .pm-tab-badge {
    background: rgba(255, 255, 255, 0.28) !important;
    color: #ffffff !important;
    border-color: rgba(255, 255, 255, 0.4) !important;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12);
  }
  [data-theme='dark'] & .pm-tab-btn,
  [data-theme='dark'] .pm-tab-btn {
    background: #1f2937 !important;
    border: 1px solid rgba(16, 185, 129, 0.25) !important;
    color: #cbd5e1 !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25) !important;
  }
  [data-theme='dark'] & .pm-tab-btn:hover,
  [data-theme='dark'] .pm-tab-btn:hover {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    border-color: #34d399 !important;
    color: #ffffff !important;
    box-shadow: 0 0 16px rgba(16, 185, 129, 0.45) !important;
  }
  [data-theme='dark'] & .pm-tab-btn--active,
  [data-theme='dark'] .pm-tab-btn--active {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    border-color: #34d399 !important;
    color: #ffffff !important;
    box-shadow: 0 0 16px rgba(16, 185, 129, 0.45) !important;
  }
  [data-theme='dark'] & .pm-tab-badge,
  [data-theme='dark'] .pm-tab-badge {
    background: rgba(255, 255, 255, 0.08) !important;
    color: #cbd5e1 !important;
    border-color: rgba(255, 255, 255, 0.12) !important;
  }
  [data-theme='dark'] & .pm-tab-btn:hover .pm-tab-badge,
  [data-theme='dark'] .pm-tab-btn:hover .pm-tab-badge {
    background: rgba(255, 255, 255, 0.28) !important;
    color: #ffffff !important;
    border-color: rgba(255, 255, 255, 0.4) !important;
  }
  [data-theme='dark'] & .pm-tab-btn--active .pm-tab-badge,
  [data-theme='dark'] .pm-tab-btn--active .pm-tab-badge {
    background: rgba(255, 255, 255, 0.25) !important;
    color: #ffffff !important;
    border-color: rgba(255, 255, 255, 0.35) !important;
  }
  
  .pm-chip-online {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px;
    border-radius: var(--radius-pill);
    font-size: 11px;
    font-weight: 700;
    background: rgba(59, 130, 246, 0.12);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.35);
  }
  .pm-chip-walkin {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px;
    border-radius: var(--radius-pill);
    font-size: 11px;
    font-weight: 700;
    background: var(--bg-hover);
    color: var(--text-secondary);
    border: 1px solid var(--border-glow-subtle);
  }
  .pm-btn-checkin {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 12px;
    border-radius: var(--radius-sm);
    font-size: 11.5px;
    font-weight: 700;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #ffffff;
    border: none;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(16,185,129,0.3);
    transition: all 0.18s ease;
  }
  .pm-btn-checkin:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16,185,129,0.4);
  }

  .pm-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 16px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 2px 8px rgba(16,185,129,0.25);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
  }
  .pm-add-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(16,185,129,0.4);
  }
  .pm-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }
  .pm-membership-filter-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .pm-filter-label {
    font-size: 13px;
    color: var(--text-secondary, #64748b);
    font-weight: 500;
    white-space: nowrap;
  }
  [data-theme='dark'] & .pm-filter-label,
  [data-theme='dark'] .pm-filter-label {
    color: #94a3b8 !important;
  }
  .pm-filter-select {
    height: 38px;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    border-radius: 8px;
    border: 1px solid var(--border-glow, #e2e8f0);
    background-color: var(--input-bg, #ffffff);
    color: var(--text-h, #334155);
    outline: none;
    cursor: pointer;
    box-sizing: border-box;
    transition: border-color 0.18s, box-shadow 0.18s;
  }
  .pm-filter-select:focus {
    border-color: var(--accent-green, #10b981);
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
  }
  [data-theme='dark'] & .pm-filter-select,
  [data-theme='dark'] .pm-filter-select {
    background: #111827 !important;
    border-color: rgba(255, 255, 255, 0.15) !important;
    color: #f8fafc !important;
  }
  .pm-show-entries {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-secondary);
  }
  .pm-controls-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .pm-print-btn {
    height: 38px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 0 16px;
    background: var(--card-bg-solid, #ffffff);
    color: var(--accent-green, #059669);
    border: 1px solid var(--border-glow, #e2e8f0);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    box-sizing: border-box;
  }
  .pm-print-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border-color: #10b981;
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
  }
  .pm-print-btn:hover:not(:disabled) svg {
    stroke: #ffffff;
  }
  .pm-print-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  [data-theme='dark'] & .pm-print-btn,
  [data-theme='dark'] .pm-print-btn {
    background: #111827 !important;
    border-color: rgba(16, 185, 129, 0.3) !important;
    color: #34d399 !important;
  }
  [data-theme='dark'] & .pm-print-btn:hover:not(:disabled),
  [data-theme='dark'] .pm-print-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    border-color: #10b981 !important;
    color: #ffffff !important;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35) !important;
  }
  [data-theme='dark'] & .pm-print-btn:hover:not(:disabled) svg,
  [data-theme='dark'] .pm-print-btn:hover:not(:disabled) svg {
    stroke: #ffffff !important;
  }
  .pm-entries-select {
    height: 38px;
    padding: 0 12px;
    border: 1px solid var(--border-glow, #e2e8f0);
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    background: var(--input-bg);
    color: var(--text);
    outline: none;
    cursor: pointer;
    box-sizing: border-box;
  }
  .pm-entries-select:focus { border-color: var(--accent-green); }
  .pm-search-wrap {
    position: relative;
    flex: 1;
    min-width: 180px;
    height: 38px;
  }
  @media (max-width: 768px) {
    .pm-controls {
      flex-wrap: wrap;
    }
    .pm-membership-filter-wrap {
      width: 100%;
    }
    .pm-search-wrap {
      width: 100%;
      flex: 1 1 auto;
    }
  }
  .pm-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary, #94a3b8);
    pointer-events: none;
  }
  .pm-search {
    width: 100%;
    height: 38px;
    padding: 0 34px 0 36px;
    border: 1px solid var(--border-glow, #e2e8f0);
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    background: var(--input-bg, #ffffff);
    color: var(--text-h, #1e293b);
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.18s, box-shadow 0.18s;
  }
  .pm-search:focus {
    border-color: var(--accent-green, #10b981);
    box-shadow: 0 0 0 3px rgba(16,185,129,0.15);
  }
  [data-theme='dark'] & .pm-search,
  [data-theme='dark'] .pm-search {
    background: #111827 !important;
    border-color: rgba(255, 255, 255, 0.15) !important;
    color: #f8fafc !important;
  }
  .pm-search-clear {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-secondary, #94a3b8);
    display: flex;
    align-items: center;
    padding: 2px;
    transition: color 0.15s;
  }
  .pm-search-clear:hover { color: var(--text-h, #1e293b); }
  .pm-table-wrap {
    border-radius: var(--radius-md);
    border: 1px solid var(--table-border, #e2e8f0);
    background: var(--card-bg-solid, #ffffff);
    box-shadow: none;
    overflow: hidden;
  }
  [data-theme='dark'] & .pm-table-wrap,
  [data-theme='dark'] .pm-table-wrap {
    background: #111827 !important;
    border-color: rgba(16, 185, 129, 0.25) !important;
  }
  .pm-table { width: 100%; border-collapse: collapse; font-family: 'Poppins', sans-serif; background: transparent; }
  .pm-table thead {
    background: var(--table-header-bg, #f8fafc);
    border-bottom: 1px solid var(--table-border, #e2e8f0);
  }
  [data-theme='dark'] & .pm-table thead,
  [data-theme='dark'] .pm-table thead {
    background: #111827 !important;
    border-bottom: 1px solid rgba(16, 185, 129, 0.25) !important;
  }
  .pm-table th {
    font-family: 'Poppins', sans-serif !important;
    padding: 14px 18px;
    text-align: left;
    font-size: 12px;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  [data-theme='dark'] & .pm-table th,
  [data-theme='dark'] .pm-table th {
    color: #a7f3d0 !important;
  }
  .pm-table td {
    font-family: 'Poppins', sans-serif !important;
    padding: 14px 18px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text, #334155);
    border-bottom: 1px solid var(--table-row-border, #f1f5f9);
    vertical-align: middle;
  }
  [data-theme='dark'] & .pm-table td,
  [data-theme='dark'] .pm-table td {
    color: #f8fafc !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
  }
  .pm-table tr:last-child td { border-bottom: none; }
  .pm-table tbody tr {
    background: transparent;
    transition: background 0.15s ease;
  }
  [data-theme='dark'] & .pm-table tbody tr,
  [data-theme='dark'] .pm-table tbody tr {
    background: transparent !important;
  }
  .pm-table tbody tr:hover {
    background: #f8fafc !important;
  }
  [data-theme='dark'] & .pm-table tbody tr:hover,
  [data-theme='dark'] .pm-table tbody tr:hover {
    background: rgba(255, 255, 255, 0.035) !important;
  }
  .pm-patient-no {
    font-size: 12px;
    font-weight: 600;
    color: #334155;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 3px 8px;
    border-radius: 6px;
    font-family: var(--mono);
    letter-spacing: 0.3px;
  }
  [data-theme='dark'] & .pm-patient-no,
  [data-theme='dark'] .pm-patient-no {
    color: #cbd5e1 !important;
    background: rgba(255, 255, 255, 0.06) !important;
    border-color: rgba(255, 255, 255, 0.12) !important;
  }
  .pm-patient-name { font-weight: 650; color: var(--text-h); }
  .pm-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: var(--radius-pill);
    font-size: 11px;
    font-weight: 700;
  }
  .pm-status--active {
    background: rgba(16, 185, 129, 0.14);
    border: 1px solid rgba(16, 185, 129, 0.4);
    color: #10b981;
  }
  [data-theme='dark'] & .pm-status--active,
  [data-theme='dark'] .pm-status--active {
    background: rgba(163, 230, 53, 0.12) !important;
    border-color: rgba(163, 230, 53, 0.35) !important;
    color: #a3e635 !important;
  }
  .pm-status--pending {
    background: rgba(245, 158, 11, 0.14);
    border: 1px solid rgba(245, 158, 11, 0.4);
    color: #fbbf24;
  }
  .pm-status--inactive {
    background: var(--bg-hover);
    border: 1px solid var(--border-glow-subtle);
    color: var(--text-secondary);
  }
  .pm-actions { display: flex; align-items: center; gap: 6px; }
  .pm-btn-view, .pm-btn-edit {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 11px;
    border-radius: var(--radius-sm);
    border: 1px solid;
    font-size: 12px;
    font-weight: 650;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.18s ease;
  }
  .pm-btn-view {
    background: rgba(59, 130, 246, 0.08);
    border-color: rgba(59, 130, 246, 0.35);
    color: #60a5fa;
  }
  .pm-btn-view:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.6);
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.25);
  }
  
  .pm-btn-edit {
    background: rgba(16, 185, 129, 0.08);
    border-color: rgba(16, 185, 129, 0.35);
    color: #34d399;
  }
  [data-theme='dark'] .pm-btn-edit {
    border-color: rgba(163, 230, 53, 0.35);
    color: #a3e635;
  }
  .pm-btn-edit:hover {
    background: rgba(16, 185, 129, 0.2);
    border-color: rgba(16, 185, 129, 0.6);
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.25);
  }
  
  .pm-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 56px 24px;
    color: var(--text-secondary);
    font-size: 14px;
    text-align: center;
  }
  .pm-spinner {
    width: 34px;
    height: 34px;
    border: 3px solid var(--border-glow-subtle);
    border-top-color: var(--accent-green);
    border-radius: 50%;
    animation: pm-spin 0.8s linear infinite;
  }
  @keyframes pm-spin { to { transform: rotate(360deg); } }
  .pm-retry-btn {
    padding: 8px 18px;
    border-radius: var(--radius-sm);
    border: none;
    background: #10b981;
    color: white;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
    font-family: inherit;
  }
  .pm-retry-btn:hover { background: #059669; }
  .pm-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding-top: 4px;
  }
  .pm-page-info { font-size: 13px; color: var(--text-secondary); }
  .pm-page-btns { display: flex; gap: 5px; }
  .pm-page-btn {
    padding: 6px 13px;
    border: 1px solid var(--border-glow);
    border-radius: var(--radius-sm);
    background: transparent;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
    font-family: inherit;
    transition: all 0.18s ease;
  }
  .pm-page-btn:hover:not(:disabled) {
    background: rgba(16, 185, 129, 0.12);
    border-color: var(--accent-green);
    color: var(--accent-green);
  }
  .pm-page-btn--active {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border-color: #10b981;
    color: white;
    font-weight: 700;
  }
  .pm-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  /* ── Revised Summary Stat Cards ── */
  .pm-stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    width: 100%;
  }
  @media (max-width: 900px) {
    .pm-stats-row {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }
  }
  @media (max-width: 600px) {
    .pm-stats-row {
      grid-template-columns: 1fr;
      gap: 10px;
    }
  }

  .pm-stat-card {
    background: var(--card-bg-solid, #ffffff);
    border: 1px solid var(--border-glow, #e2e8f0);
    border-radius: 14px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    position: relative;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  }
  .pm-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
    border-color: #cbd5e1;
  }
  [data-theme='dark'] & .pm-stat-card,
  [data-theme='dark'] .pm-stat-card {
    background: #111827 !important;
    border-color: rgba(16, 185, 129, 0.25) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
  }
  [data-theme='dark'] & .pm-stat-card:hover,
  [data-theme='dark'] .pm-stat-card:hover {
    border-color: #10b981 !important;
  }

  .pm-stat-icon {
    width: 48px;
    height: 48px;
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #d1fae5;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }
  .pm-stat-card:hover .pm-stat-icon {
    transform: scale(1.05);
  }
  [data-theme='dark'] & .pm-stat-icon,
  [data-theme='dark'] .pm-stat-icon {
    background: rgba(16, 185, 129, 0.12) !important;
    border-color: rgba(16, 185, 129, 0.25) !important;
    color: #34d399 !important;
  }

  .pm-stat-icon--teal {
    background: #f0fdfa;
    color: #0d9488;
    border-color: #ccfbf1;
  }
  .pm-stat-icon--green {
    background: #ecfdf5;
    color: #059669;
    border-color: #d1fae5;
  }
  .pm-stat-icon--emerald {
    background: #f0fdf4;
    color: #16a34a;
    border-color: #dcfce7;
  }
  [data-theme='dark'] & .pm-stat-icon--teal,
  [data-theme='dark'] .pm-stat-icon--teal {
    background: rgba(13, 148, 136, 0.12) !important;
    border-color: rgba(13, 148, 136, 0.25) !important;
    color: #2dd4bf !important;
  }
  [data-theme='dark'] & .pm-stat-icon--green,
  [data-theme='dark'] .pm-stat-icon--green {
    background: rgba(16, 185, 129, 0.12) !important;
    border-color: rgba(16, 185, 129, 0.25) !important;
    color: #34d399 !important;
  }
  [data-theme='dark'] & .pm-stat-icon--emerald,
  [data-theme='dark'] .pm-stat-icon--emerald {
    background: rgba(22, 163, 74, 0.12) !important;
    border-color: rgba(22, 163, 74, 0.25) !important;
    color: #4ade80 !important;
  }

  .pm-stat-body {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .pm-stat-label {
    font-size: 11.5px;
    font-weight: 600;
    color: #64748b;
    margin: 0 0 3px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  [data-theme='dark'] & .pm-stat-label,
  [data-theme='dark'] .pm-stat-label {
    color: #94a3b8 !important;
  }

  .pm-stat-value {
    font-size: 26px;
    font-weight: 750;
    color: #0f172a;
    margin: 0 0 2px;
    line-height: 1.1;
    letter-spacing: -0.5px;
  }
  [data-theme='dark'] & .pm-stat-value,
  [data-theme='dark'] .pm-stat-value {
    color: #f8fafc !important;
  }

  .pm-stat-sub {
    font-size: 12px;
    color: #64748b;
    margin: 0;
    font-weight: 500;
  }
  [data-theme='dark'] & .pm-stat-sub,
  [data-theme='dark'] .pm-stat-sub {
    color: #94a3b8 !important;
  }

  .pm-bulk-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    border-radius: 10px;
    margin-bottom: 8px;
    gap: 12px;
    flex-wrap: wrap;
    animation: pm-fadeIn 0.2s ease-out;
  }
  @keyframes pm-fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .pm-bulk-bar-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #065f46;
  }
  .pm-bulk-bar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pm-btn-bulk-send {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    background: #059669;
    color: white;
    border: none;
    border-radius: 7px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
    transition: all 0.15s;
  }
  .pm-btn-bulk-send:hover:not(:disabled) {
    background: #047857;
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(5, 150, 105, 0.3);
  }
  .pm-btn-bulk-send:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .pm-btn-bulk-clear {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    background: transparent;
    color: #4b5563;
    border: 1px solid #d1d5db;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }
  .pm-btn-bulk-clear:hover {
    background: #f3f4f6;
    color: #111827;
  }
  .pm-checkbox {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #059669;
  }

  @media (max-width: 900px) {
    .pm-layout { grid-template-columns: 1fr; }
    .pm-side-panel { flex-direction: row; position: static; }
    .pm-stat-card { flex: 1; }
  }
  @media (max-width: 600px) {
    .pm-side-panel { flex-direction: column; }
    .pm-controls { flex-direction: column; align-items: stretch; }
    .pm-show-entries { justify-content: space-between; }
    .pm-search-wrap { min-width: unset; }
  }
`;
