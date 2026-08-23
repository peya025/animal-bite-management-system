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
    display: grid; grid-template-columns: 1fr 260px; gap: 20px; align-items: start;
  }
  .pm-main-panel {
    background: var(--card-bg); border-radius: 14px; border: 1px solid var(--card-border);
    padding: 24px; display: flex; flex-direction: column; gap: 18px;
  }
  .pm-panel-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    flex-wrap: wrap; gap: 12px;
  }
  .pm-title { font-size: 25px; font-weight: 600; color: var(--text-h); margin: 0 0 7px; letter-spacing: -0.5px; line-height: 1.2; }
  .pm-subtitle { font-size: 13px; color: var(--text-secondary); margin: 0; }
  
  /* Unified Filter Tabs */
  .pm-tabs {
    display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 1px solid var(--card-border);
    padding-bottom: 12px; margin-bottom: 4px;
  }
  .pm-tab-btn {
    display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px;
    border-radius: 9px; border: 1px solid var(--card-border); background: var(--input-bg);
    color: var(--text); font-size: 13px; font-weight: 500; cursor: pointer;
    font-family: inherit; transition: all 0.15s;
  }
  .pm-tab-btn:hover { background: var(--bg-hover); }
  .pm-tab-btn--active {
    background: #10b981; border-color: #10b981; color: #ffffff; font-weight: 600;
    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
  }
  .pm-tab-badge {
    padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 700;
    background: rgba(0,0,0,0.08); color: inherit;
  }
  .pm-tab-btn--active .pm-tab-badge {
    background: rgba(255,255,255,0.25); color: #ffffff;
  }
  
  .pm-chip-online {
    display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px;
    border-radius: 6px; font-size: 11px; font-weight: 600;
    background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;
  }
  .pm-chip-walkin {
    display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px;
    border-radius: 6px; font-size: 11px; font-weight: 600;
    background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb;
  }
  .pm-btn-checkin {
    display: inline-flex; align-items: center; gap: 4px; padding: 5px 11px;
    border-radius: 6px; font-size: 11.5px; font-weight: 600;
    background: #10b981; color: #ffffff; border: none; cursor: pointer;
    box-shadow: 0 2px 4px rgba(16,185,129,0.2); transition: all 0.15s;
  }
  .pm-btn-checkin:hover { background: #059669; transform: translateY(-1px); }

  .pm-add-btn {
    display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white; border: none; border-radius: 8px; font-size: 13px;
    font-weight: 600; cursor: pointer; font-family: inherit;
    box-shadow: 0 2px 8px rgba(16,185,129,0.25);
    transition: all 0.2s; white-space: nowrap;
  }
  .pm-add-btn:hover {
    transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16,185,129,0.35);
  }
  .pm-controls {
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 12px;
  }
  .pm-show-entries {
    display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary);
  }
  .pm-controls-right {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  }
  .pm-print-btn {
    display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white; border: none; border-radius: 8px; font-size: 13px;
    font-weight: 600; cursor: pointer; font-family: inherit;
    box-shadow: 0 2px 8px rgba(16,185,129,0.25);
    transition: all 0.2s; white-space: nowrap;
  }
  .pm-print-btn:hover {
    transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16,185,129,0.35);
  }
  .pm-print-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .pm-entries-select {
    padding: 6px 10px; border: 1px solid var(--card-border); border-radius: 6px;
    font-size: 13px; font-family: inherit; background: var(--input-bg); color: var(--text);
    outline: none; cursor: pointer;
  }
  .pm-entries-select:focus { border-color: #10b981; }
  .pm-search-wrap { position: relative; min-width: 220px; }
  .pm-search-icon {
    position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
    color: var(--text-secondary); pointer-events: none;
  }
  .pm-search {
    width: 100%; padding: 9px 34px 9px 34px; border: 1px solid var(--card-border);
    border-radius: 8px; font-size: 13px; font-family: inherit; background: var(--input-bg);
    color: var(--text-h); outline: none; box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .pm-search:focus {
    border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.1);
  }
  .pm-search-clear {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; color: var(--text-secondary);
    display: flex; align-items: center; padding: 2px; transition: color 0.15s;
  }
  .pm-search-clear:hover { color: var(--text-h); }
  .pm-table-wrap {
    border-radius: 10px; border: 1px solid var(--card-border); overflow: hidden;
  }
  .pm-table { width: 100%; border-collapse: collapse; }
  .pm-table thead { background: var(--table-header-bg); border-bottom: 1px solid var(--table-border); }
  .pm-table th {
    padding: 11px 16px; text-align: left; font-size: 12px; font-weight: 600;
    color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;
  }
  .pm-table td {
    padding: 13px 16px; font-size: 13px; color: var(--text);
    border-bottom: 1px solid var(--table-row-border); vertical-align: middle;
  }
  .pm-table tr:last-child td { border-bottom: none; }
  .pm-table tbody tr:hover { background: var(--bg-hover); }
  .pm-patient-no {
    font-size: 12px; font-weight: 600; color: var(--text-secondary); background: var(--bg-hover);
    padding: 3px 8px; border-radius: 6px; font-family: monospace;
  }
  .pm-patient-name { font-weight: 600; color: var(--text-h); }
  .pm-status {
    display: inline-block; padding: 3px 10px; border-radius: 999px;
    font-size: 12px; font-weight: 600;
  }
  .pm-status--active { background: rgba(16, 185, 129, 0.15); color: #10b981; }
  .pm-status--pending { background: rgba(217, 119, 6, 0.15); color: #fbbf24; }
  .pm-status--inactive { background: var(--bg-hover); color: var(--text-secondary); }
  .pm-actions { display: flex; align-items: center; gap: 6px; }
  .pm-btn-view, .pm-btn-edit {
    display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px;
    border-radius: 7px; border: 1px solid; font-size: 12px; font-weight: 600;
    cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .pm-btn-view { background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.2); color: #3b82f6; }
  .pm-btn-view:hover { background: rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.4); color: #2563eb; }
  
  .pm-btn-edit { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); color: #10b981; }
  .pm-btn-edit:hover { background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.4); color: #059669; }
  
  .pm-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 12px; padding: 56px 24px; color: var(--text-secondary); font-size: 14px; text-align: center;
  }
  .pm-spinner {
    width: 34px; height: 34px; border: 3px solid var(--card-border);
    border-top-color: #10b981; border-radius: 50%;
    animation: pm-spin 0.8s linear infinite;
  }
  @keyframes pm-spin { to { transform: rotate(360deg); } }
  .pm-retry-btn {
    padding: 8px 18px; border-radius: 8px; border: none; background: #10b981;
    color: white; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
  }
  .pm-retry-btn:hover { background: #059669; }
  .pm-pagination {
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 12px; padding-top: 4px;
  }
  .pm-page-info { font-size: 13px; color: var(--text-secondary); }
  .pm-page-btns { display: flex; gap: 5px; }
  .pm-page-btn {
    padding: 6px 13px; border: 1px solid var(--card-border); border-radius: 7px;
    background: var(--card-bg); font-size: 13px; font-weight: 500; color: var(--text);
    cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .pm-page-btn:hover:not(:disabled) { background: var(--bg-hover); border-color: var(--card-border); }
  .pm-page-btn--active {
    background: #10b981; border-color: #10b981; color: white; font-weight: 600;
  }
  .pm-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .pm-side-panel {
    display: flex; flex-direction: column; gap: 14px; position: sticky; top: 16px;
  }
  .pm-stat-card {
    border-radius: 14px; padding: 20px; color: #fff; display: flex;
    align-items: center; gap: 16px; position: relative; overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .pm-stat-card:hover {
    transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  }
  .pm-stat-card::after {
    content: ''; position: absolute; top: -16px; right: -16px; width: 70px;
    height: 70px; border-radius: 50%; background: rgba(255,255,255,0.12);
  }
  .pm-stat-card--teal { background: linear-gradient(135deg, #14b8a6, #0d9488); }
  .pm-stat-card--green { background: linear-gradient(135deg, #22c55e, #16a34a); }
  .pm-stat-card--emerald { background: linear-gradient(135deg, #10b981, #059669); }
  .pm-stat-icon {
    width: 44px; height: 44px; background: rgba(255,255,255,0.2);
    border-radius: 12px; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .pm-stat-body { display: flex; flex-direction: column; min-width: 0; }
  .pm-stat-label {
    font-size: 12px; font-weight: 500; opacity: 0.85; margin: 0 0 4px;
    text-transform: uppercase; letter-spacing: 0.4px;
  }
  .pm-stat-value { font-size: 30px; font-weight: 800; margin: 0 0 2px; line-height: 1; }
  .pm-stat-sub { font-size: 11px; opacity: 0.7; margin: 0; }

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
