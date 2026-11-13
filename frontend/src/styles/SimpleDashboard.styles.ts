import { styled } from '@mui/material/styles';

export const AppStyleScope = styled('div')`
  display: contents;

  *, *::before, *::after { box-sizing: border-box; }
  .sd-layout, .sd-layout * {
    font-family: 'Poppins', 'Inter', 'Segoe UI', sans-serif;
  }
  .sd-layout {
    display: flex; height: 100vh; max-height: 100vh; overflow: hidden; background: var(--bg);
    font-family: 'Poppins', 'Inter', 'Segoe UI', sans-serif;
  }
  .sd-sidebar {
    width: 272px; height: 100vh; max-height: 100vh; background: var(--sidebar-bg); display: flex;
    flex-direction: column; padding: 0; flex-shrink: 0; position: relative;
    transition: width 0.2s ease; overflow: hidden;
    border-right: 1px solid var(--sidebar-border); z-index: 10;
  }
  .sd-sidebar--collapsed { width: 64px; }
  .sd-brand {
    display: flex; align-items: center; gap: 10px; padding: 0 16px;
    border-bottom: 1px solid var(--sidebar-header-border);
    height: 68px; min-height: 68px; flex-shrink: 0;
  }
  .sd-brand-logo {
    width: 36px; height: 36px; background: var(--nav-item-active-bg);
    border: 1px solid var(--card-border); border-radius: 10px; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .sd-brand-text { display: flex; flex-direction: column; overflow: hidden; }
  .sd-brand-clinic {
    font-size: 13px; font-weight: 700; color: var(--nav-item-active-color); white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .sd-brand-app { font-size: 10px; color: var(--text-secondary); margin-top: 1px; }
  .sd-nav {
    flex: 1; padding: 18px 12px; display: flex; flex-direction: column;
    gap: 2px; overflow-y: auto;
  }
  .sd-nav-item {
    width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 10px;
    border: 1px solid transparent; background: transparent; color: var(--nav-item-color);
    border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 500;
    text-align: left; transition: all 0.15s; white-space: nowrap; font-family: inherit;
  }
  .sd-nav-item:hover { background: var(--nav-item-hover-bg); color: var(--nav-item-hover-color); }
  .sd-nav-item--active { background: var(--nav-item-active-bg); border-color: var(--card-border); color: var(--nav-item-active-color); font-weight: 650; }
  .sd-nav-item--active:hover { background: var(--nav-item-active-bg); }
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
    border: none; background: transparent; color: var(--nav-item-color);
    border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;
    text-align: left; transition: all 0.15s; font-family: inherit;
  }
  .sd-submenu-item:hover { background: var(--nav-item-hover-bg); color: var(--nav-item-hover-color); }
  .sd-submenu-item--active { color: var(--nav-item-active-color); background: var(--nav-item-active-bg); font-weight: 700; }
  .sd-submenu-dot {
    width: 5px; height: 5px; border-radius: 50%; background: currentColor;
    flex-shrink: 0; opacity: 0.6;
  }
  .sd-user {
    display: flex; align-items: center; gap: 10px; padding: 12px 14px;
    border-top: 1px solid var(--sidebar-header-border); min-height: 68px;
  }
  .sd-user-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: #277a4b; color: #fff;
    font-size: 12px; font-weight: 700; display: flex; align-items: center;
    justify-content: center; flex-shrink: 0;
  }
  .sd-user-info { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
  .sd-user-name {
    font-size: 12px; font-weight: 600; color: var(--text-h); white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .sd-user-role { font-size: 10px; color: var(--text-secondary); white-space: nowrap; }
  .sd-logout-btn {
    background: transparent; border: none; color: var(--text-secondary);
    cursor: pointer; padding: 4px; border-radius: 6px; display: flex;
    transition: all 0.15s; flex-shrink: 0;
  }
  .sd-logout-btn:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
  .sd-toggle-brand {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; background: transparent; border: none;
    border-radius: 6px; color: var(--text-h); cursor: pointer;
    transition: all 0.15s; flex-shrink: 0;
  }
  .sd-toggle-brand:hover { background: var(--nav-item-hover-bg); color: #10b981; }
  .sd-sidebar--collapsed .sd-brand { justify-content: center; padding: 0; }
  .sd-main {
    flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0;
  }
  .sd-topbar {
    height: 68px; background: var(--topbar-bg); border-bottom: 1px solid var(--topbar-border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 32px; flex-shrink: 0; position: sticky; top: 0; z-index: 5;
    backdrop-filter: blur(12px);
  }
  .sd-topbar-left { display: flex; align-items: center; gap: 14px; }
  .sd-topbar-title { font-size: 15px; font-weight: 650; color: var(--text-h); }
  .sd-topbar-right { display: flex; align-items: center; gap: 14px; }
  .sd-topbar-date { font-size: 12px; color: var(--text-secondary); }
  .sd-topbar-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: #277a4b; color: #fff;
    font-size: 12px; font-weight: 700; display: flex; align-items: center;
    justify-content: center;
  }
  .sd-content { flex: 1; padding: 4px 32px 32px; overflow-y: auto; background: var(--bg); }
  .sd-dash-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 10px; flex-wrap: wrap; gap: 12px;
  }
  .sd-dash-header h1 { font-size: 22px; line-height: 1.2; letter-spacing: -0.5px; font-weight: 600; color: var(--text-h); margin: 0 0 2px; }
  .sd-dash-header p { font-size: 12px; color: var(--text-secondary); margin: 0; }
  .sd-dash-tabs {
    display: flex;
    gap: 4px;
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.22);
    border-radius: 999px;
    padding: 4px;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
  }
  [data-theme='dark'] .sd-dash-tabs {
    background: rgba(163, 230, 53, 0.06);
    border-color: rgba(163, 230, 53, 0.2);
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
  }
  .sd-dash-tab {
    padding: 6px 16px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    border-radius: 999px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .sd-dash-tab:hover {
    color: #0f172a;
    background: #f1f5f9;
  }
  [data-theme='dark'] .sd-dash-tab:hover {
    color: #f8fafc;
    background: rgba(255, 255, 255, 0.08);
  }
  .sd-dash-tab--active {
    background: #0f172a;
    color: #ffffff !important;
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
  }
  [data-theme='dark'] .sd-dash-tab--active {
    background: #1e293b;
    color: #ffffff !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  }
  .sd-cards-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }
  .sd-card {
    border-radius: 20px;
    padding: 16px 16px 14px;
    background: #ffffff;
    border: 1px solid rgba(16, 185, 129, 0.25);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 116px;
    cursor: default;
    transition: box-shadow 0.25s ease;
  }
  [data-theme='dark'] .sd-card {
    background: #111827;
    border: 1px solid rgba(16, 185, 129, 0.25);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  .sd-card:hover {
    box-shadow: 0 8px 22px rgba(16, 185, 129, 0.28), 0 2px 8px rgba(16, 185, 129, 0.16);
  }
  [data-theme='dark'] .sd-card:hover {
    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35), 0 0 16px rgba(16, 185, 129, 0.25);
  }
  .sd-card-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin: 0 0 8px;
    color: #047857;
  }
  [data-theme='dark'] .sd-card-label {
    color: #a7f3d0;
  }
  .sd-card-value {
    font-size: 26px;
    font-weight: 800;
    margin: 0 0 4px;
    line-height: 1;
    letter-spacing: -0.5px;
    color: #064e3b;
  }
  [data-theme='dark'] .sd-card-value {
    color: #ffffff;
  }
  .sd-card-sub {
    font-size: 11px;
    font-weight: 600;
    margin: 0;
    color: #64748b;
  }
  [data-theme='dark'] .sd-card-sub {
    color: #94a3b8;
  }

  .sd-charts-row, .sd-charts-bottom {
    display: grid;
    grid-template-columns: 1fr 1fr 280px;
    gap: 18px;
    margin-bottom: 24px;
  }
  .sd-charts-bottom { grid-template-columns: 1fr 1fr; }
  
  .sd-chart-card {
    background: #ffffff;
    border-radius: 20px;
    padding: 20px 24px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease;
  }
  [data-theme='dark'] .sd-chart-card {
    background: #111827;
    border: 1px solid rgba(16, 185, 129, 0.25);
    box-shadow: none;
  }
  .sd-chart-card:hover {
    transform: translateY(-2px);
    border-color: #cbd5e1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  }
  [data-theme='dark'] .sd-chart-card:hover {
    border-color: rgba(16, 185, 129, 0.45);
    box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.6);
  }

  .sd-chart-title {
    font-size: 13.5px;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 16px;
    letter-spacing: -0.2px;
  }
  [data-theme='dark'] .sd-chart-title {
    color: #ffffff;
  }
  .sd-chart-title span {
    color: #64748b;
    font-weight: 500;
    font-size: 12px;
    margin-left: 4px;
  }
  [data-theme='dark'] .sd-chart-title span {
    color: #94a3b8;
  }

  .sd-line-chart { width: 100%; display: block; }
  .sd-donut-wrap { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
  .sd-donut-legend { display: flex; flex-direction: column; gap: 8px; }
  .sd-donut-legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text); }
  .sd-donut-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .sd-donut-legend-pct { margin-left: auto; font-weight: 700; color: var(--text-h); padding-left: 12px; }

  .sd-filter-card {
    background: #ffffff;
    border-radius: 20px;
    padding: 18px 22px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    gap: 0;
    transition: all 0.2s ease;
  }
  [data-theme='dark'] .sd-filter-card {
    background: #111827;
    border: 1px solid rgba(16, 185, 129, 0.25);
    box-shadow: none;
  }
  .sd-filter-title {
    font-size: 13.5px;
    font-weight: 750;
    color: #1e293b;
    margin: 0 0 14px;
    letter-spacing: -0.2px;
  }
  [data-theme='dark'] .sd-filter-title {
    color: #ffffff;
  }
  .sd-filter-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; }
  .sd-filter-label {
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  [data-theme='dark'] .sd-filter-label {
    color: #94a3b8;
  }
  .sd-filter-select {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    color: #1e293b;
    background: #ffffff;
    cursor: pointer;
    font-family: inherit;
    width: 100%;
    appearance: none;
    transition: all 0.18s ease;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
  }
  [data-theme='dark'] .sd-filter-select {
    background: var(--input-bg);
    border-color: var(--input-border);
    color: var(--input-text);
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
  }
  .sd-filter-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }
  [data-theme='dark'] .sd-filter-select:focus {
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
  }
  .sd-filter-divider { border: none; border-top: 1px solid var(--sidebar-header-border); margin: 10px 0; }
  .sd-filter-link {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    color: #475569;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.18s ease;
  }
  [data-theme='dark'] .sd-filter-link {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
  }
  .sd-filter-link:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #0f172a;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  }
  [data-theme='dark'] .sd-filter-link:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }

  @media (max-width: 1200px) {
    .sd-top-arrangement { grid-template-columns: 1fr !important; }
    .sd-cards-grid { grid-template-columns: repeat(2, 1fr) !important; }
  }
  @media (max-width: 900px) {
    .sd-filters-bar-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .sd-analytics-row { grid-template-columns: 1fr !important; }
    .sd-charts-row, .sd-charts-bottom { grid-template-columns: 1fr; }
  }
  @media (max-width: 600px) {
    .sd-filters-bar-grid { grid-template-columns: 1fr !important; }
    .sd-cards-grid { grid-template-columns: 1fr !important; }
    .sd-content { padding: 16px; }
    .sd-topbar { padding: 0 16px; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
