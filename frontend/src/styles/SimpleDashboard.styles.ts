import { styled } from '@mui/material/styles';

export const AppStyleScope = styled('div')`
  display: contents;

  *, *::before, *::after { box-sizing: border-box; }
  .sd-layout {
    display: flex; min-height: 100vh; background: #f5f6fa;
    font-family: 'Inter', 'Segoe UI', sans-serif;
  }
  .sd-sidebar {
    width: 240px; min-height: 100vh; background: #1e2a4a; display: flex;
    flex-direction: column; padding: 0; position: sticky; top: 0; flex-shrink: 0;
    transition: width 0.2s ease; overflow: hidden;
  }
  .sd-sidebar--collapsed { width: 64px; }
  .sd-brand {
    display: flex; align-items: center; gap: 10px; padding: 20px 16px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.07); min-height: 64px;
  }
  .sd-brand-logo {
    width: 36px; height: 36px; background: rgba(16,185,129,0.15);
    border-radius: 10px; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .sd-brand-text { display: flex; flex-direction: column; overflow: hidden; }
  .sd-brand-clinic {
    font-size: 13px; font-weight: 700; color: #fff; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .sd-brand-app { font-size: 10px; color: rgba(255,255,255,0.4); margin-top: 1px; }
  .sd-nav {
    flex: 1; padding: 12px 8px; display: flex; flex-direction: column;
    gap: 2px; overflow-y: auto;
  }
  .sd-nav-item {
    width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 10px;
    border: none; background: transparent; color: rgba(255,255,255,0.55);
    border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500;
    text-align: left; transition: all 0.15s; white-space: nowrap; font-family: inherit;
  }
  .sd-nav-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
  .sd-nav-item--active { background: rgba(16,185,129,0.18); color: #10b981; }
  .sd-nav-item--active:hover { background: rgba(16,185,129,0.25); }
  .sd-nav-icon { display: flex; align-items: center; flex-shrink: 0; }
  .sd-nav-label { flex: 1; }
  .sd-nav-chevron {
    display: flex; align-items: center; margin-left: auto; opacity: 0.5;
    transition: transform 0.2s;
  }
  .sd-nav-chevron--open { transform: rotate(180deg); }
  .sd-submenu {
    margin-left: 36px; margin-top: 2px; display: flex; flex-direction: column; gap: 1px;
  }
  .sd-submenu-item {
    width: 100%; display: flex; align-items: center; gap: 8px; padding: 7px 10px;
    border: none; background: transparent; color: rgba(255,255,255,0.45);
    border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;
    text-align: left; transition: all 0.15s; font-family: inherit;
  }
  .sd-submenu-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.75); }
  .sd-submenu-item--active { color: #10b981; background: rgba(16,185,129,0.12); }
  .sd-submenu-dot {
    width: 5px; height: 5px; border-radius: 50%; background: currentColor;
    flex-shrink: 0; opacity: 0.6;
  }
  .sd-user {
    display: flex; align-items: center; gap: 10px; padding: 12px 14px;
    border-top: 1px solid rgba(255,255,255,0.07); min-height: 60px;
  }
  .sd-user-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg,#10b981,#059669); color: #fff;
    font-size: 12px; font-weight: 700; display: flex; align-items: center;
    justify-content: center; flex-shrink: 0;
  }
  .sd-user-info { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
  .sd-user-name {
    font-size: 12px; font-weight: 600; color: #fff; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .sd-user-role { font-size: 10px; color: rgba(255,255,255,0.4); white-space: nowrap; }
  .sd-logout-btn {
    background: transparent; border: none; color: rgba(255,255,255,0.4);
    cursor: pointer; padding: 4px; border-radius: 6px; display: flex;
    transition: all 0.15s; flex-shrink: 0;
  }
  .sd-logout-btn:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
  .sd-toggle {
    position: absolute; bottom: 72px; right: -12px; width: 24px; height: 24px;
    background: #1e2a4a; border: 1.5px solid rgba(255,255,255,0.15);
    border-radius: 50%; color: rgba(255,255,255,0.6); display: flex;
    align-items: center; justify-content: center; cursor: pointer;
    transition: all 0.15s; z-index: 10;
  }
  .sd-toggle:hover { background: #10b981; border-color: #10b981; color: #fff; }
  .sd-main {
    flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0;
  }
  .sd-topbar {
    height: 56px; background: #fff; border-bottom: 1px solid #e5e7eb;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px; flex-shrink: 0; position: sticky; top: 0; z-index: 5;
  }
  .sd-topbar-title { font-size: 15px; font-weight: 700; color: #1e2a4a; }
  .sd-topbar-right { display: flex; align-items: center; gap: 14px; }
  .sd-topbar-date { font-size: 12px; color: #9ca3af; }
  .sd-topbar-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg,#10b981,#059669); color: #fff;
    font-size: 12px; font-weight: 700; display: flex; align-items: center;
    justify-content: center;
  }
  .sd-content { flex: 1; padding: 24px; overflow-y: auto; }
  .sd-dash-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
  }
  .sd-dash-header h1 { font-size: 22px; font-weight: 800; color: #1e2a4a; margin: 0 0 4px; }
  .sd-dash-header p { font-size: 13px; color: #9ca3af; margin: 0; }
  .sd-dash-tabs { display: flex; gap: 4px; background: #f3f4f6; border-radius: 10px; padding: 4px; }
  .sd-dash-tab {
    padding: 6px 14px; border: none; background: transparent; color: #6b7280;
    border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 500;
    font-family: inherit; transition: all 0.15s;
  }
  .sd-dash-tab:hover { color: #1e2a4a; background: rgba(0,0,0,0.04); }
  .sd-dash-tab--active {
    background: #fff; color: #1e2a4a; font-weight: 700;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }
  .sd-cards-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;
  }
  .sd-card {
    background: #fff; border-radius: 14px; padding: 20px; border: 1px solid #f0f1f3;
  }
  .sd-card-label { font-size: 12px; color: #9ca3af; font-weight: 500; margin: 0 0 8px; }
  .sd-card-value { font-size: 28px; font-weight: 800; margin: 0 0 4px; }
  .sd-card-sub { font-size: 11px; font-weight: 500; margin: 0; opacity: 0.65; }
  .sd-card--purple { border-top: 3px solid #8b5cf6; }
  .sd-card--purple .sd-card-value, .sd-card--purple .sd-card-sub { color: #7c3aed; }
  .sd-card--blue { border-top: 3px solid #3b82f6; }
  .sd-card--blue .sd-card-value, .sd-card--blue .sd-card-sub { color: #2563eb; }
  .sd-card--indigo { border-top: 3px solid #6366f1; }
  .sd-card--indigo .sd-card-value, .sd-card--indigo .sd-card-sub { color: #4f46e5; }
  .sd-card--teal { border-top: 3px solid #14b8a6; }
  .sd-card--teal .sd-card-value, .sd-card--teal .sd-card-sub { color: #0d9488; }
  .sd-card--violet { border-top: 3px solid #a78bfa; }
  .sd-card--violet .sd-card-value, .sd-card--violet .sd-card-sub { color: #7c3aed; }
  .sd-card--cyan { border-top: 3px solid #22d3ee; }
  .sd-card--cyan .sd-card-value, .sd-card--cyan .sd-card-sub { color: #0891b2; }
  .sd-card--green { border-top: 3px solid #22c55e; }
  .sd-card--green .sd-card-value, .sd-card--green .sd-card-sub { color: #16a34a; }
  .sd-card--emerald { border-top: 3px solid #10b981; }
  .sd-card--emerald .sd-card-value, .sd-card--emerald .sd-card-sub { color: #059669; }
  .sd-charts-row, .sd-charts-bottom {
    display: grid; grid-template-columns: 1fr 1fr 280px; gap: 16px; margin-bottom: 24px;
  }
  .sd-charts-bottom { grid-template-columns: 1fr 1fr; }
  .sd-chart-card {
    background: #fff; border-radius: 14px; padding: 20px; border: 1px solid #f0f1f3;
  }
  .sd-chart-title { font-size: 13px; font-weight: 700; color: #1e2a4a; margin: 0 0 16px; }
  .sd-chart-title span { color: #9ca3af; font-weight: 400; margin-left: 4px; }
  .sd-line-chart { width: 100%; display: block; }
  .sd-donut-wrap { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .sd-donut-legend { display: flex; flex-direction: column; gap: 8px; }
  .sd-donut-legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #374151; }
  .sd-donut-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .sd-donut-legend-pct { margin-left: auto; font-weight: 700; color: #1e2a4a; padding-left: 12px; }
  .sd-filter-card {
    background: #fff; border-radius: 14px; padding: 20px; border: 1px solid #f0f1f3;
    display: flex; flex-direction: column; gap: 0;
  }
  .sd-filter-title { font-size: 13px; font-weight: 700; color: #1e2a4a; margin: 0 0 16px; }
  .sd-filter-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; }
  .sd-filter-label {
    font-size: 11px; font-weight: 600; color: #6b7280;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .sd-filter-select {
    padding: 7px 10px; border: 1px solid #e5e7eb; border-radius: 8px;
    font-size: 13px; color: #374151; background: #fafafa; cursor: pointer;
    font-family: inherit; width: 100%; appearance: none;
  }
  .sd-filter-select:focus { outline: none; border-color: #10b981; }
  .sd-filter-divider { border: none; border-top: 1px solid #f3f4f6; margin: 10px 0; }
  .sd-filter-link {
    width: 100%; display: flex; align-items: center; gap: 8px; padding: 8px 12px;
    background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;
    color: #374151; font-size: 13px; font-weight: 500; cursor: pointer;
    font-family: inherit; transition: all 0.15s;
  }
  .sd-filter-link:hover { background: #ecfdf5; border-color: #10b981; color: #059669; }

  @media (max-width: 1100px) {
    .sd-cards-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 900px) {
    .sd-charts-row, .sd-charts-bottom { grid-template-columns: 1fr; }
  }
  @media (max-width: 600px) {
    .sd-cards-grid { grid-template-columns: 1fr; }
    .sd-content { padding: 16px; }
    .sd-topbar { padding: 0 16px; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
