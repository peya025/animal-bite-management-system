import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { AppThemeProvider } from '../../src/shared/contexts/ThemeContext';
import { AuthProvider } from '../../src/shared/contexts/AuthContext';
import { WalkthroughProvider, WalkthroughHelpButton } from '../../src/features/walkthrough';
import '../../src/styles/global.css';

function MockDashboard() {
  return (
    <div
      className="sd-dashboard-container"
      data-walkthrough="dashboard-overview"
      data-tour="dashboard-overview"
      style={{ padding: 24 }}
    >
      <div
        className="sd-dash-header"
        data-walkthrough="dashboard-header"
        style={{
          padding: '12px 16px',
          borderRadius: 16,
          background: '#ffffff',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div data-walkthrough="dashboard-welcome" data-tour="dashboard-welcome">
          <h1 style={{ margin: 0, fontSize: 24 }}>Animal Bite Treatment Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Overview · November 2026</p>
        </div>
        <div className="sd-dash-tabs" data-walkthrough="dashboard-tabs" data-tour="dashboard-tabs" style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={{ padding: '6px 14px' }}>Overview</button>
          <button type="button" style={{ padding: '6px 14px' }}>Cases</button>
          <button type="button" style={{ padding: '6px 14px' }}>Vaccinations</button>
        </div>
      </div>

      <div
        className="sd-top-arrangement"
        style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 14, marginBottom: 16, alignItems: 'stretch' }}
      >
        <div
          className="sd-chart-card"
          data-walkthrough="dashboard-calendar"
          data-tour="dashboard-calendar"
          style={{ minHeight: 280, padding: 20, background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0' }}
        >
          <strong>November 2026 Calendar</strong>
        </div>

        <div
          className="sd-cards-grid"
          data-walkthrough="dashboard-stat-cards"
          data-tour="dashboard-summary-cards"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}
        >
          <div style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>Total Patients: 120</div>
          <div style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>Today's Queue: 5</div>
          <div style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>New Today: 3</div>
          <div style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>Total Bite Cases: 45</div>
          <div style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>Active Cases: 12</div>
          <div style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>Completed Cases: 33</div>
          <div style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>Pending Doses: 8</div>
          <div style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>Total Scheduled: 19</div>
          <div style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>Queue Count: 5</div>
        </div>
      </div>

      <div className="sd-chart-card" style={{ padding: 20, background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', marginBottom: 18 }}>
        <div data-walkthrough="dashboard-filters" data-tour="dashboard-filters" style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 10px', fontWeight: 700 }}>Filters</p>
          <div className="sd-filters-bar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            <select><option>All Roles</option></select>
            <select><option>All Status</option></select>
            <select><option>This Month</option></select>
            <button type="button">Patients</button>
            <button type="button">Cases</button>
          </div>
        </div>
        <div
          className="sd-analytics-row"
          data-walkthrough="dashboard-trends"
          data-tour="dashboard-trends"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, minHeight: 230 }}
        >
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12 }}>Cases Over Time (last 6 months)</div>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12 }}>Vaccination Trend (last 6 months)</div>
        </div>
      </div>

      <div
        className="sd-analytics-row"
        data-walkthrough="dashboard-risk-row"
        data-tour="dashboard-risk-row"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, minHeight: 235 }}
      >
        <div style={{ background: '#fff', padding: 20, borderRadius: 20, border: '1px solid #e2e8f0' }}>Case Distribution</div>
        <div style={{ background: '#fff', padding: 20, borderRadius: 20, border: '1px solid #e2e8f0' }}>High &amp; Low Risk Places</div>
      </div>
    </div>
  );
}

function MockPatients() {
  return (
    <div style={{ padding: 24 }}>
      <div
        className="pm-panel-header"
        data-walkthrough="patients-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}
      >
        <div>
          <h1>Patient Management</h1>
          <div data-testid="patients-breadcrumb">Dashboard › Patient Registration</div>
        </div>
        <button className="pm-add-btn" data-walkthrough="btn-add-patient" style={{ padding: '10px 18px' }}>
          Add Patient
        </button>
      </div>

      <div
        className="pm-stats-row"
        data-walkthrough="patients-stats"
        data-tour="patients-summary"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}
      >
        <div style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>Total Patients: 120</div>
        <div style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>Active Patients: 18</div>
        <div style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>Follow-up Patients: 9</div>
      </div>

      <div className="pm-tabs" style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button data-walkthrough="tab-today-queue" style={{ padding: '8px 14px' }}>Today's Queue</button>
        <button data-walkthrough="tab-all-patients" style={{ padding: '8px 14px' }}>All Patients</button>
        <button data-walkthrough="tab-online-appointments" style={{ padding: '8px 14px' }}>Online Appointments</button>
        <button data-walkthrough="tab-pre-registered" style={{ padding: '8px 14px' }}>Pre-Registered (Mobile)</button>
        <button data-walkthrough="tab-overdue" style={{ padding: '8px 14px' }}>Overdue</button>
      </div>

      <div
        className="pm-controls"
        data-walkthrough="patients-search-filter"
        style={{ display: 'flex', gap: 12, padding: 12, background: '#f8fafc', borderRadius: 8, marginBottom: 16 }}
      >
        <select><option>All Programs</option></select>
        <input placeholder="Search patients..." />
      </div>

      <div className="pm-table-wrap" data-walkthrough="patients-table-actions">
        <table className="pm-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Patient No.</th>
              <th>Name</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ height: 52, borderBottom: '1px solid #e2e8f0' }}>
              <td>PT-001</td>
              <td>Juan Dela Cruz</td>
              <td>
                <div className="pm-actions">
                  <button>Check In</button>
                  <button>View</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MockQueue() {
  return (
    <div style={{ padding: 24 }}>
      <div
        data-walkthrough="queue-header"
        data-testid="queue-header-breadcrumb"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Registration Queue Dashboard</h1>
          <div>Dashboard › Treatment Queues › Station 1: New &amp; Day 0</div>
        </div>
        <button data-walkthrough="queue-display-btn" style={{ padding: '8px 14px' }}>
          Queue Display
        </button>
      </div>

      <div
        data-walkthrough="queue-kpi-strip"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}
      >
        <div style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>Waiting: 4</div>
        <div style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>Called: 1</div>
        <div style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>Serving: 2</div>
        <div style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>Completed: 10</div>
        <div style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>Total Today: 17</div>
      </div>

      <div
        id="queue-table-container"
        data-walkthrough="queue-table"
        data-tour="registration-queue-table"
        style={{ padding: 24, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, minHeight: 340 }}
      >
        <h2 style={{ marginTop: 0 }}>Registration Queue (4 patients waiting)</h2>
        <div
          data-walkthrough="queue-filter-bar"
          data-tour="queue-filter-bar"
          style={{ display: 'flex', gap: 12, padding: 12, background: '#f8fafc', borderRadius: 8, marginBottom: 16 }}
        >
          <input placeholder="Search patient name or queue #..." style={{ flex: 1, padding: 8 }} />
          <select><option>All Statuses</option></select>
          <select><option>All Categories</option></select>
        </div>
        <div style={{ padding: 24, border: '1px solid #f1f5f9', borderRadius: 8 }}>
          Queue #001 - Maria Clara - Waiting in Triage
        </div>
      </div>
    </div>
  );
}

function MockBiteCasesSummary() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Bite Cases Summary</h1>
        <div>Dashboard › Bite Cases Summary</div>
      </div>

      <div
        data-walkthrough="bite-cases-kpi-cards"
        data-tour="bite-cases-kpi-cards"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 16 }}
      >
        <div style={{ padding: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>TOTAL CASES: 42</div>
        <div style={{ padding: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>ACTIVE CASES: 12</div>
        <div style={{ padding: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>COMPLETED: 30</div>
        <div style={{ padding: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>HIGH-PRIORITY: 2</div>
        <div style={{ padding: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>OVERDUE DOSES: 1</div>
        <div style={{ padding: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>PEP COMPLIANCE: 92%</div>
      </div>

      <div
        data-walkthrough="bite-cases-filter-bar"
        data-tour="bite-cases-filter-bar"
        style={{ display: 'flex', gap: 10, padding: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 16 }}
      >
        <button type="button">Location Priority</button>
        <button type="button">All Cases</button>
        <input placeholder="Search case, patient, location..." />
        <select><option>All severity</option></select>
        <select><option>All Statuses</option></select>
      </div>

      <div
        data-walkthrough="bite-cases-table"
        data-tour="bite-cases-table"
        style={{ padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, minHeight: 280 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <strong>Location Priority Summary</strong>
          <button type="button">Export CSV</button>
        </div>
        <div style={{ padding: 16, border: '1px solid #f1f5f9', borderRadius: 8 }}>
          #1 Poblacion — High Priority — 18 cases
        </div>
      </div>
    </div>
  );
}

function MockBiteMap() {
  const [kpiLoaded, setKpiLoaded] = useState(false);
  const noMarkers = new URLSearchParams(window.location.search).get('emptyMarkers') === '1';

  useEffect(() => {
    const t = setTimeout(() => setKpiLoaded(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Bite Location Map</h1>
        <div>Dashboard › Bite Location Map</div>
      </div>

      {kpiLoaded && (
        <div
          data-testid="bitemap-kpi-row"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}
        >
          <div data-testid="bitemap-card-total" style={{ minHeight: 118, padding: 16, background: '#fff', border: '1px solid #10b981', borderRadius: 20 }}>
            TOTAL CASES: 42
          </div>
          <div data-testid="bitemap-card-cat3" style={{ minHeight: 118, padding: 16, background: '#fff', border: '1px solid #ef4444', borderRadius: 20 }}>
            CATEGORY III: 12
          </div>
          <div data-testid="bitemap-card-cat2" style={{ minHeight: 118, padding: 16, background: '#fff', border: '1px solid #f59e0b', borderRadius: 20 }}>
            CATEGORY II: 18
          </div>
          <div data-testid="bitemap-card-cat1" style={{ minHeight: 118, padding: 16, background: '#fff', border: '1px solid #10b981', borderRadius: 20 }}>
            CATEGORY I: 12
          </div>
        </div>
      )}

      <div
        data-walkthrough="bitemap-container"
        style={{ border: '1px solid #e2e8f0', borderRadius: 16, background: '#fff', overflow: 'hidden' }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div data-walkthrough="bitemap-filters" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span>Filter Map:</span>
            <select><option>All Time</option></select>
            <select><option>All Categories</option></select>
            <select><option>All Cases</option></select>
          </div>

          <div data-walkthrough="bitemap-view-toggle" style={{ display: 'inline-flex', gap: 4 }}>
            <button
              data-walkthrough="bitemap-pins-btn"
              data-tour="bite-map-pins-toggle"
              style={{ padding: '6px 12px' }}
            >
              Pins &amp; Clusters
            </button>
            <button
              data-walkthrough="bitemap-heatmap-btn"
              data-tour="bite-map-heatmap-toggle"
              style={{ padding: '6px 12px' }}
            >
              Density Heatmap
            </button>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div
            data-walkthrough="bitemap-map-view"
            data-tour="bite-map-container"
            className="leaflet-container"
            style={{ position: 'relative', height: 650, width: '100%', background: '#e2f1ec', borderRadius: 8 }}
          >
            {!noMarkers && (
              <>
                <div
                  data-tour="bite-map-marker"
                  className="leaflet-marker-icon custom-cluster-icon"
                  style={{
                    position: 'absolute',
                    top: 240,
                    left: 360,
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: '#10b981',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  8
                </div>
                <div
                  data-tour="bite-map-marker"
                  className="leaflet-marker-icon custom-marker-icon"
                  style={{
                    position: 'absolute',
                    top: 310,
                    left: 520,
                    width: 25,
                    height: 25,
                    borderRadius: '50%',
                    background: '#ef4444',
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MockReports() {
  return (
    <div style={{ padding: 24 }}>
      <header
        className="rr-header"
        data-walkthrough="reports-header"
        data-testid="reports-page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Reports &amp; Analytics</h1>
          <div>Dashboard › Reports &amp; Analytics</div>
        </div>
        <div data-walkthrough="reports-action-buttons" style={{ display: 'flex', gap: 12 }}>
          <button style={{ padding: '8px 14px' }}>Export CSV</button>
          <button style={{ padding: '8px 14px' }}>Print Report</button>
        </div>
      </header>

      <div
        data-walkthrough="reports-tabs"
        data-tour="reports-category-tabs"
        className="MuiTabs-root"
        style={{ display: 'flex', gap: 16, padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}
      >
        <button>Overview</button>
        <button>PEP &amp; Follow-up</button>
        <button>Bite Surveillance</button>
        <button>Clinic Summary</button>
      </div>

      <div
        className="rr-overview-top-section"
        data-walkthrough="reports-summary-cards"
        data-tour="reports-summary-cards"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}
      >
        <div style={{ height: 155, padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
          PEP vaccine-course completion: 88%
        </div>
        <div style={{ height: 155, padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
          Follow-up priorities today
        </div>
        <div style={{ height: 115, padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
          Average time to first dose: 0.4 days
        </div>
        <div style={{ height: 115, padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
          Patients needing follow-up: 2
        </div>
      </div>

      <div className="rr-panel rr-unified-surveillance-container" style={{ padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16 }}>
        <h2>Bite Surveillance Analytics</h2>
        <div
          className="rr-filter-row"
          data-walkthrough="reports-filters"
          data-tour="reports-filter-controls"
          style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', marginBottom: 20 }}
        >
          <select aria-label="Period"><option>This month</option></select>
          <input type="date" aria-label="From" defaultValue="2026-11-01" />
          <input type="date" aria-label="To" defaultValue="2026-11-07" />
          <select aria-label="Category"><option>All categories</option></select>
          <button type="button">Apply</button>
          <button type="button">Reset</button>
        </div>

        <div
          className="rr-surveillance-row-1"
          data-walkthrough="reports-charts"
          data-tour="reports-charts"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, minHeight: 280 }}
        >
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12 }}>Category Trend Chart</div>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12 }}>Age at Incident Chart</div>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12 }}>Day of Week Chart</div>
        </div>
      </div>
    </div>
  );
}

function TestShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <aside
        className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}
        style={{
          width: sidebarOpen ? 240 : 64,
          background: '#064e3b',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div
          className="sidebar-header"
          data-walkthrough="sidebar-clinic-info"
          data-tour="sidebar-clinic-info"
          style={{ height: 68, display: 'flex', alignItems: 'center', padding: sidebarOpen ? '0 16px' : '0', justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
        >
          {sidebarOpen ? (
            <div className="clinic-info">
              <h2 style={{ fontSize: 15, margin: 0 }}>RHU ABTC Clinic</h2>
            </div>
          ) : (
            <button
              type="button"
              data-testid="sidebar-expand-btn"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
          )}
        </div>
        <nav className="sidebar-nav" data-walkthrough="sidebar-nav" data-tour="sidebar-nav" style={{ flex: 1, padding: 8 }}>
          <button type="button" data-tour="nav-item-dashboard" data-nav-item="dashboard" onClick={() => navigate('/dashboard')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 8, color: '#fff', background: 'none', border: 'none' }}>Dashboard</button>
          <button type="button" data-tour="nav-item-patient-registration" data-nav-item="patient-registration" onClick={() => navigate('/patients')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 8, color: '#fff', background: 'none', border: 'none' }}>Patient Registration</button>
          <button type="button" data-tour="nav-item-treatment-queues" data-nav-item="treatment-queues" onClick={() => navigate('/queue')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 8, color: '#fff', background: 'none', border: 'none' }}>Treatment Queues</button>
          <button type="button" data-tour="nav-item-bite-cases-summary" data-nav-item="bite-cases-summary" onClick={() => navigate('/bite-cases')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 8, color: '#fff', background: 'none', border: 'none' }}>Bite Cases Summary</button>
          <button type="button" data-tour="nav-item-bite-map" data-nav-item="bite-map" onClick={() => navigate('/bite-map')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 8, color: '#fff', background: 'none', border: 'none' }}>Bite Map</button>
          <button type="button" data-tour="nav-item-reports-analytics" data-nav-item="reports-analytics" onClick={() => navigate('/reports')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 8, color: '#fff', background: 'none', border: 'none' }}>Reports &amp; Analytics</button>
        </nav>
        {sidebarOpen ? (
          <div className="sidebar-user" data-walkthrough="sidebar-user" style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            <span>Registration Staff</span>
            <button
              type="button"
              className="sidebar-logout-btn"
              data-walkthrough="btn-logout"
              data-tour="btn-logout"
              title="Logout"
              style={{ padding: '6px 10px' }}
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="sidebar-footer-actions" style={{ padding: 8 }}>
            <button
              type="button"
              className="nav-item nav-item-logout"
              data-walkthrough="btn-logout"
              data-tour="btn-logout"
              title="Logout"
              style={{ padding: 6 }}
            >
              ⎋
            </button>
          </div>
        )}
      </aside>

      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <header
          className="top-header"
          data-testid="global-top-header"
          style={{
            height: 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {sidebarOpen && (
              <button
                type="button"
                data-testid="sidebar-collapse-btn"
                onClick={() => setSidebarOpen(false)}
              >
                Collapse
              </button>
            )}
            <span>ABTC System</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <WalkthroughHelpButton />
          </div>
        </header>

        <main className="page-content" style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function TestApp() {
  return (
    <AppThemeProvider>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <WalkthroughProvider>
            <TestShell>
              <Routes>
                <Route path="/" element={<MockDashboard />} />
                <Route path="/tests/registration/walkthrough.html" element={<MockDashboard />} />
                <Route path="/dashboard" element={<MockDashboard />} />
                <Route path="/patients" element={<MockPatients />} />
                <Route path="/queue" element={<MockQueue />} />
                <Route path="/bite-cases" element={<MockBiteCasesSummary />} />
                <Route path="/bite-map" element={<MockBiteMap />} />
                <Route path="/reports" element={<MockReports />} />
                <Route path="*" element={<MockDashboard />} />
              </Routes>
            </TestShell>
          </WalkthroughProvider>
        </AuthProvider>
      </BrowserRouter>
    </AppThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(<TestApp />);
