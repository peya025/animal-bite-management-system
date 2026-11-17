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
          <button type="button" data-walkthrough="dashboard-tab-overview" style={{ padding: '6px 14px' }}>Overview</button>
          <button type="button" data-walkthrough="dashboard-tab-cases" style={{ padding: '6px 14px' }}>Cases</button>
          <button type="button" data-walkthrough="dashboard-tab-vaccinations" style={{ padding: '6px 14px' }}>Vaccinations</button>
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
          <div data-walkthrough="calendar-nav">
            <strong>November 2026 Calendar</strong>
          </div>
        </div>

        <div
          className="sd-cards-grid"
          data-walkthrough="dashboard-stat-cards"
          data-tour="dashboard-summary-cards"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}
        >
          <div data-walkthrough="card-total-patients" style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>Total Patients: 120</div>
          <div data-walkthrough="card-today-queue" style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>Today's Queue: 5</div>
          <div data-walkthrough="card-new-today" style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>New Today: 3</div>
          <div data-walkthrough="card-total-bite-cases" style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>Total Bite Cases: 45</div>
          <div data-walkthrough="card-active-cases" style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>Active Cases: 12</div>
          <div data-walkthrough="card-completed-cases" style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>Completed Cases: 33</div>
          <div data-walkthrough="card-pending-doses" style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>Pending Doses: 8</div>
          <div data-walkthrough="card-total-scheduled" style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>Total Scheduled: 19</div>
          <div data-walkthrough="card-queue-count" style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>Queue Count: 5</div>
        </div>
      </div>

      <div className="sd-chart-card" style={{ padding: 20, background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', marginBottom: 18 }}>
        <div data-walkthrough="dashboard-filters" data-tour="dashboard-filters" style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 10px', fontWeight: 700 }}>Filters</p>
          <div className="sd-filters-bar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            <select data-walkthrough="filter-role"><option>All Roles</option></select>
            <select data-walkthrough="filter-status"><option>All Status</option></select>
            <select data-walkthrough="filter-date-range"><option>This Month</option></select>
            <button type="button" data-walkthrough="btn-goto-patients">Patients</button>
            <button type="button" data-walkthrough="btn-goto-cases">Cases</button>
          </div>
        </div>
        <div
          className="sd-analytics-row"
          data-walkthrough="dashboard-trends"
          data-tour="dashboard-trends"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, minHeight: 230 }}
        >
          <div data-walkthrough="chart-cases-over-time" style={{ background: '#f8fafc', padding: 16, borderRadius: 12 }}>Cases Over Time (last 6 months)</div>
          <div data-walkthrough="chart-vaccination-trend" style={{ background: '#f8fafc', padding: 16, borderRadius: 12 }}>Vaccination Trend (last 6 months)</div>
        </div>
      </div>

      <div
        className="sd-analytics-row"
        data-walkthrough="dashboard-risk-row"
        data-tour="dashboard-risk-row"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, minHeight: 235 }}
      >
        <div data-walkthrough="chart-case-distribution" style={{ background: '#fff', padding: 20, borderRadius: 20, border: '1px solid #e2e8f0' }}>
          <div data-walkthrough="case-dist-period-controls">Case Distribution</div>
        </div>
        <div data-walkthrough="chart-risk-places" style={{ background: '#fff', padding: 20, borderRadius: 20, border: '1px solid #e2e8f0' }}>
          <span data-walkthrough="risk-places-municipality">Tagoloan</span>
          <button type="button" data-walkthrough="btn-risk-places-bitemap">Bite Map</button>
          <div>High &amp; Low Risk Places</div>
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div data-walkthrough="table-recent-cases" style={{ padding: 16, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>Recent Cases Table</div>
        <div data-walkthrough="table-recent-vaccinations" style={{ padding: 16, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>Recent Vaccinations Table</div>
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
        <div className="pm-membership-filter-wrap" data-walkthrough="patients-program-filter">
          <select><option>All Programs</option></select>
        </div>
        <div className="pm-search-wrap" data-walkthrough="patients-search-input">
          <input placeholder="Search patients..." />
        </div>
        <button data-patient-action="print" className="pm-print-btn">Print</button>
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
                <div className="pm-actions" style={{ display: 'flex', gap: 6 }}>
                  <span data-patient-action="awaiting-checkin" className="pm-badge-awaiting-checkin">Booked — Awaiting Check-In</span>
                  <button data-patient-action="checkin-mobile">Check In to Triage</button>
                  <button data-patient-action="new-exposure">+ New Exposure</button>
                  <button data-patient-action="portal-invite">Portal Invite</button>
                  <button data-patient-action="view">View</button>
                  <button data-patient-action="checkin">Check In</button>
                  <button data-patient-action="checkin-reassessment">Check In for Reassessment</button>
                  <button data-patient-action="checkin-nurse">Check In to Nurse</button>
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
    <div style={{ padding: 24 }} className="queue-header">
      <div
        data-walkthrough="queue-header"
        data-testid="queue-header-breadcrumb"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Registration Queue Dashboard</h1>
          <div>Dashboard › Treatment Queues › Station 1: New &amp; Day 0</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            data-walkthrough="btn-vax-avail"
            data-tour="btn-vaccine-availability"
            style={{ padding: '8px 14px' }}
          >
            Vaccine Availability
          </button>
          <button
            data-walkthrough="queue-display-btn"
            data-tour="btn-queue-display"
            style={{ padding: '8px 14px' }}
          >
            Queue Display
          </button>
        </div>
      </div>

      <div
        data-walkthrough="queue-kpi-strip"
        data-tour="queue-kpi-cards"
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
        data-tour="queue-table"
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

function MockNursePatients() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Station 2: Follow-up Doses</h1>
        <div>Dashboard › Treatment Queues › Station 2</div>
      </div>

      <div
        data-tour="nurse-kpi-cards"
        data-walkthrough="nurse-kpi-cards"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}
      >
        <div style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>Due Today: 8</div>
        <div style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>Overdue: 3</div>
        <div style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>Booked: 5</div>
        <div style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>Upcoming: 12</div>
        <div style={{ padding: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>Total Tracked: 28</div>
      </div>

      <div
        data-tour="nurse-tabs"
        data-walkthrough="nurse-tabs"
        style={{ display: 'flex', gap: 10, marginBottom: 16 }}
      >
        <button style={{ padding: '8px 14px' }}>Due Today</button>
        <button style={{ padding: '8px 14px' }}>Overdue Patients</button>
        <button style={{ padding: '8px 14px' }}>Online Bookings</button>
      </div>

      <div
        data-tour="nurse-filters"
        data-walkthrough="nurse-filters"
        style={{ display: 'flex', gap: 10, padding: 12, background: '#f8fafc', borderRadius: 8, marginBottom: 16 }}
      >
        <select><option>All PEP Milestones (Day 3, 7, 14, 28)</option></select>
        <input placeholder="Search follow-up patient..." />
      </div>

      <div
        data-tour="nurse-table"
        data-walkthrough="nurse-table"
        style={{ padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottom: '1px solid #f1f5f9' }}>
          <span>Juan Luna — Dose 2 (Day 3) — Due Today</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={{ padding: '6px 12px' }}>Reschedule</button>
            <button type="button" className="btn-record-dose" style={{ padding: '6px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6 }}>
              Record Dose
            </button>
          </div>
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

function MockVaccinationSchedule() {
  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <header
        data-walkthrough="vax-sched-header"
        data-testid="vax-sched-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Vaccination Schedule</h1>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Dashboard › Vaccination Schedule</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            type="button"
            data-walkthrough="vax-sched-btn-auto-recall"
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', fontWeight: 600 }}
          >
            ⚡ Run Auto-Recall Sweep
          </button>
          <button
            type="button"
            data-walkthrough="vax-sched-btn-bulk-recall"
            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600 }}
          >
            📢 Recall All Missed (1)
          </button>
          <button
            type="button"
            data-walkthrough="vax-sched-btn-refresh"
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569' }}
          >
            Refresh
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div
        data-walkthrough="vax-sched-kpi-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}
      >
        <div data-walkthrough="vax-sched-kpi-total" style={{ padding: 16, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#047857' }}>TOTAL PEP CASES</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#064e3b' }}>8</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>8 Walk-in • 0 Online</div>
        </div>
        <div data-walkthrough="vax-sched-kpi-on_track" style={{ padding: 16, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#047857' }}>ON TRACK</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#064e3b' }}>4</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Adherent to schedule</div>
        </div>
        <div data-walkthrough="vax-sched-kpi-due_today" style={{ padding: 16, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>DUE TODAY</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#92400e' }}>0</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Expected injection today</div>
        </div>
        <div data-walkthrough="vax-sched-kpi-overdue_missed" style={{ padding: 16, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c' }}>OVERDUE / MISSED</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#b91c1c' }}>1</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Defaulters requiring recall</div>
        </div>
        <div data-walkthrough="vax-sched-kpi-completed" style={{ padding: 16, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#047857' }}>COMPLETED PEP</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#064e3b' }}>3</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Full regimen completed</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        data-walkthrough="vax-sched-filters-bar"
        style={{ padding: 16, background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <div data-walkthrough="vax-sched-filter-status">
            <select defaultValue="matrix" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #a7f3d0', background: '#f0fdf4' }}>
              <option value="matrix">All Patients (8)</option>
              <option value="today">Today's Injections (0)</option>
            </select>
          </div>
          <div data-walkthrough="vax-sched-filter-channel">
            <select defaultValue="all" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <option value="all">All Channels</option>
              <option value="walk_in">Walk-in Only</option>
              <option value="online">Online Mobile Only</option>
            </select>
          </div>
          <div data-walkthrough="vax-sched-filter-dose">
            <select defaultValue="all" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <option value="all">All Doses</option>
              <option value="Day 0">Day 0 (Initial)</option>
              <option value="Day 3">Day 3</option>
              <option value="Day 7">Day 7</option>
              <option value="Booster">Booster Doses</option>
            </select>
          </div>
        </div>
        <div data-walkthrough="vax-sched-search">
          <input type="text" placeholder="Search patient name, ID..." style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', width: 220 }} />
        </div>
      </div>

      {/* Patient Stepper Matrix List */}
      <div style={{ padding: 16, background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
        <div
          data-walkthrough="vax-sched-batch-select"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13 }}>
            <input type="checkbox" /> Select all on page (8)
          </label>
        </div>

        <div data-walkthrough="vax-sched-patient-list" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Patient 1: Active */}
          <div
            data-walkthrough="vax-sched-patient-card"
            style={{ padding: 18, borderRadius: 12, border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '3.5fr 5fr 3fr', gap: 16, alignItems: 'center' }}
          >
            <div data-walkthrough="vax-sched-patient-profile">
              <div style={{ fontWeight: 700, fontSize: 15 }}>Cyrill Ong <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f1f5f9' }}>Walk-In</span></div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>P-2026-0008 • 21y male • 09873265874</div>
              <div style={{ fontSize: 11, color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: 6, display: 'inline-block', marginTop: 4 }}>Category I • Dog (N/A)</div>
            </div>
            <div data-walkthrough="vax-sched-dose-stepper" style={{ display: 'flex', gap: 8, background: '#f8fafc', padding: 8, borderRadius: 10, justifyContent: 'center' }}>
              <div data-walkthrough="vax-sched-dose-badge" style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 11 }}>
                <strong>Day 0 (Initial)</strong><br />Pending
              </div>
              <div style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 11 }}>
                <strong>Day 3</strong><br />Pending
              </div>
              <div style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 11 }}>
                <strong>Day 7</strong><br />Pending
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" data-walkthrough="vax-sched-btn-card" style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, fontWeight: 600 }}>
                👁 Card
              </button>
            </div>
          </div>

          {/* Patient 2: Overdue Defaulter */}
          <div
            data-walkthrough="vax-sched-overdue-alert"
            style={{ padding: 18, borderRadius: 12, border: '1px solid #fca5a5', background: '#fffdfd', display: 'grid', gridTemplateColumns: '3.5fr 5fr 3fr', gap: 16, alignItems: 'center' }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Twella Sabella <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f1f5f9' }}>Walk-In</span></div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>P-2026-0002 • 21y female • 09354872514</div>
              <div style={{ fontSize: 11, color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: 6, display: 'inline-block', marginTop: 4 }}>Category III • cat (N/A)</div>
            </div>
            <div style={{ display: 'flex', gap: 8, background: '#f8fafc', padding: 8, borderRadius: 10, justifyContent: 'center' }}>
              <div style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#047857', fontSize: 11 }}>
                <strong>Day 0 (Initial)</strong><br />2026-10-27
              </div>
              <div style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontSize: 11 }}>
                <strong>Day 3</strong><br />Missed
              </div>
              <div style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontSize: 11 }}>
                <strong>Day 7</strong><br />Missed
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>Next: Day 3 on Oct 30, 2026 (17 days overdue)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" data-walkthrough="vax-sched-btn-single-recall" style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 600 }}>
                  ✉ Send Recall
                </button>
                <button type="button" style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, fontWeight: 600 }}>
                  👁 Card
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div data-walkthrough="vax-sched-pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 12, borderTop: '1px solid #f1f5f9', fontSize: 13, color: '#64748b' }}>
          <div>Rows per page: 10</div>
          <div>1-8 of 8</div>
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
          <button type="button" data-tour="nav-item-vaccinations" data-nav-item="vaccinations" onClick={() => navigate('/vaccinations')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: 8, color: '#fff', background: 'none', border: 'none' }}>Vaccination Schedule</button>
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
                <Route path="/nurse/patients" element={<MockNursePatients />} />
                <Route path="/bite-cases" element={<MockBiteCasesSummary />} />
                <Route path="/bite-map" element={<MockBiteMap />} />
                <Route path="/reports" element={<MockReports />} />
                <Route path="/vaccinations" element={<MockVaccinationSchedule />} />
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
