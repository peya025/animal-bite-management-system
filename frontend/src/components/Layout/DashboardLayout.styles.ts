import { styled } from '@mui/material/styles';

export const DashboardLayoutRoot = styled('div')`
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
  font-family: 'Poppins', 'Inter', 'Segoe UI', sans-serif;
  color: var(--text);

  .sidebar {
    width: 270px;
    background: var(--sidebar-bg);
    border-right: 1px solid var(--sidebar-border);
    display: flex;
    flex-direction: column;
    transition: width 0.25s ease;
    position: relative;
    flex-shrink: 0;
  }
  .sidebar.closed { width: 64px; }
  .sidebar-toggle-collapsed {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-glow);
    background: transparent;
    color: var(--nav-item-color);
    cursor: pointer;
    transition: all 0.18s ease;
  }
  .sidebar-toggle-collapsed:hover {
    background: var(--nav-item-hover-bg);
    border-color: var(--accent-green);
    color: var(--accent-green);
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
  }
  .sidebar-header {
    height: 68px;
    min-height: 68px;
    max-height: 68px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid var(--sidebar-header-border);
    flex-shrink: 0;
    width: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }
  .clinic-logo {
    width: 38px;
    height: 38px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }
  .clinic-logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }
  .clinic-info {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    gap: 1px;
  }
  .clinic-info h2 {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--text-h);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.25;
  }
  .clinic-info .app-name {
    font-size: 9.5px;
    color: var(--text-secondary);
    margin: 0;
    white-space: normal;
    text-transform: uppercase;
    letter-spacing: 0.35px;
    line-height: 1.3;
    font-weight: 600;
  }
  .sidebar-nav {
    flex: 1;
    padding: 12px 8px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .sidebar-footer-actions {
    padding: 10px 8px 12px;
    border-top: 1px solid var(--sidebar-header-border);
    flex-shrink: 0;
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--nav-item-color);
    font-size: 13px;
    font-weight: 500;
    border-radius: var(--radius-sm);
    cursor: pointer;
    width: 100%;
    text-align: left;
    font-family: inherit;
    white-space: nowrap;
    transition: all 0.18s ease;
    position: relative;
  }
  .nav-item:hover {
    background: var(--nav-item-hover-bg);
    color: var(--nav-item-hover-color);
    border-color: var(--border-glow-subtle);
  }
  .nav-item.active {
    background: var(--nav-item-active-bg);
    color: var(--nav-item-active-color);
    border-color: var(--border-glow);
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
  }
  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
  .nav-label { flex: 1; }
  .nav-chevron {
    margin-left: auto;
    flex-shrink: 0;
    transition: transform 0.2s;
    color: var(--text-secondary);
  }
  .nav-chevron.expanded { transform: rotate(180deg); }
  .sidebar.closed .nav-label, .sidebar.closed .nav-chevron { display: none; }
  .sidebar.closed .nav-item {
    justify-content: center;
    padding: 10px 0;
  }
  .sidebar.closed .sidebar-footer-actions {
    padding: 10px 0 12px;
    display: flex;
    justify-content: center;
  }
  .submenu {
    margin-left: 8px;
    margin-top: 2px;
    margin-bottom: 4px;
    border-left: 1px solid var(--sidebar-border);
    padding-left: 8px;
  }
  .submenu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--nav-item-color);
    font-size: 12.5px;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    width: 100%;
    text-align: left;
    font-family: inherit;
    transition: all 0.15s ease;
    margin-bottom: 1px;
  }
  .submenu-item:hover {
    background: var(--nav-item-hover-bg);
    color: var(--nav-item-hover-color);
  }
  .submenu-item.active {
    background: var(--nav-item-active-bg);
    border-color: var(--border-glow-subtle);
    color: var(--nav-item-active-color);
    font-weight: 700;
  }
  .submenu-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--nav-item-color);
    flex-shrink: 0;
  }
  .submenu-item.active .submenu-dot {
    background: var(--accent-green);
    box-shadow: 0 0 6px var(--accent-green);
  }
  .submenu-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sidebar-user {
    padding: 12px 14px;
    border-top: 1px solid var(--sidebar-header-border);
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    overflow: hidden;
  }
  .sidebar-user-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 750;
    font-size: 12.5px;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
  }
  .sidebar-user-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .sidebar-user-name {
    font-size: 12.5px;
    font-weight: 650;
    color: var(--text-h);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sidebar-user-role {
    font-size: 10.5px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sidebar-logout-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-glow);
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-secondary);
    flex-shrink: 0;
    transition: all 0.18s ease;
  }
  .sidebar-logout-btn:hover {
    background: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.45);
    color: #ef4444;
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.25);
  }
  .nav-item-logout:hover {
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
  }
  .header-toggle {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-glow);
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.18s ease;
    color: var(--text-secondary);
    flex-shrink: 0;
  }
  .header-toggle:hover {
    background: var(--nav-item-hover-bg);
    border-color: var(--accent-green);
    color: var(--accent-green);
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
  }
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }
  .top-header {
    height: 68px;
    min-height: 68px;
    max-height: 68px;
    background: var(--topbar-bg);
    border-bottom: 1px solid var(--topbar-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 28px;
    flex-shrink: 0;
    box-sizing: border-box;
  }
  .header-left { display: flex; align-items: center; gap: 16px; }
  .header-left h1 { font-size: 18px; font-weight: 700; color: var(--text-h); margin: 0; }
  .header-right { display: flex; align-items: center; gap: 16px; }
  .user-menu { display: flex; align-items: center; gap: 12px; }
  .user-info { display: flex; align-items: center; gap: 10px; }
  .user-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 13px;
    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
  }
  .user-details { display: flex; flex-direction: column; }
  .user-name { font-size: 13.5px; font-weight: 650; color: var(--text-h); margin: 0; }
  .user-role { font-size: 11px; color: var(--text-secondary); margin: 0; }
  .logout-button {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-glow);
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.18s ease;
  }
  .logout-button:hover {
    background: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.45);
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.25);
  }
  .logout-button svg { color: var(--text-secondary); }
  .logout-button:hover svg { color: #ef4444; }
  .page-content { flex: 1; overflow-y: auto; padding: 18px 32px 28px; }

  @media (max-width: 768px) {
    .sidebar {
      position: fixed; left: 0; top: 0; height: 100vh; z-index: 100;
      transform: translateX(-100%); box-shadow: 4px 0 16px rgba(0,0,0,0.1);
      transition: transform 0.25s ease, width 0.25s ease;
    }
    .sidebar.open { transform: translateX(0); }
    .sidebar.closed { width: 270px; transform: translateX(-100%); }
    .user-details { display: none; }
    .page-content { padding: 20px 16px; }
  }
`;
