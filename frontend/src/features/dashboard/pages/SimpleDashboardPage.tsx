import { lazy, Suspense, useId, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { Typography } from '@mui/material';
import api from '../../../shared/services/api';
import { ROUTES } from '../../../shared/config/routes';
import DashboardLayout from '../../../components/Layout/DashboardLayout';
import { useChartInView } from '../hooks/useChartInView';
import '../styles/dashboardCharts.css';
import {
  getPhilippineRegularHolidays,
  type CalendarHoliday,
} from '../../../shared/utils/philippineHolidays';

import {
  MISAMIS_ORIENTAL_MUNICIPALITIES,
  FALLBACK_BARANGAYS,
} from '../../patients/hooks/useAddressLocation';
import type { PsgcItem } from '../../patients/types';

const PSGC_API = 'https://psgc.gitlab.io/api';
const MIS_OR_CODE = '104300000';
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const AnnouncementManager = lazy(() => import('../../announcements/AnnouncementsPage'));
type DashboardTab = 'overview' | 'cases' | 'vaccinations' | 'announcements';

function isAuthenticated(): boolean {
  const token = localStorage.getItem('authToken');
  const userData = localStorage.getItem('userData');
  return !!(token && userData);
}

export function SimpleDashboardPage() {
  const navigate = useNavigate();

  // Instant synchronous state initialization from cached session
  const [user, setUser] = useState<any>(() => {
    const raw = localStorage.getItem('userData');
    return raw ? JSON.parse(raw) : null;
  });
  const [clinic, setClinic] = useState<any>(() => {
    const raw = localStorage.getItem('clinicData');
    if (raw) return JSON.parse(raw);
    const uRaw = localStorage.getItem('userData');
    return uRaw ? (JSON.parse(uRaw)?.clinic ?? null) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => !localStorage.getItem('userData'));
  const [setupCheckDone, setSetupCheckDone] = useState<boolean>(() => !!localStorage.getItem('userData'));
  const [searchParams, setSearchParams] = useSearchParams();
  const canManageAnnouncements = !!user && user.is_active !== false &&
    ['admin', 'developer', 'registration', 'triage', 'treatment', 'doctor', 'nurse', 'staff'].includes(user.role);
  const requestedTab = searchParams.get('tab');
  const activeTab: DashboardTab = requestedTab === 'cases' || requestedTab === 'vaccinations' ||
    (requestedTab === 'announcements' && canManageAnnouncements) ? requestedTab : 'overview';
  const setActiveTab = (tab: DashboardTab) => setSearchParams(previous => {
    const next = new URLSearchParams(previous);
    if (tab === 'overview') next.delete('tab');
    else next.set('tab', tab);
    return next;
  }, { replace: true });
  const [caseDistPeriod, setCaseDistPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  // Location / Place & Barangay Risk State (Using Registration PSGC API)
  const [municipalities, setMunicipalities] = useState<PsgcItem[]>(MISAMIS_ORIENTAL_MUNICIPALITIES);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('104324000'); // Default: Tagoloan
  const [barangayRiskList, setBarangayRiskList] = useState<{ name: string; count: number; risk: 'High' | 'Moderate' | 'Low' }[]>([]);
  const [loadingBarangays, setLoadingBarangays] = useState<boolean>(false);
  const [mapIncidentStats, setMapIncidentStats] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<any>({
    totalPatients: 0,
    activeCases: 0,
    pendingVaccinations: 0,
    todayQueue: 0,
    completedCases: 0,
    followupPatients: 0,
    biteCases: 0,
    newToday: 0,
    casesList: [],
    vaccinationsList: [],
  });

  // 1. Fetch real statistics and bite map data from database
  useEffect(() => {
    if (!setupCheckDone || isLoading) return;

    const fetchStats = async () => {
      try {
        const [patientsRes, casesRes, vaccineRes, queueRes, mapRes] = await Promise.all([
          api.get('/patients?per_page=1'),
          api.get('/cases/statistics'),
          api.get('/vaccinations/statistics'),
          api.get('/queue/statistics'),
          api.get('/cases/map-data').catch(() => ({ data: null })),
        ]);

        const [recentCasesRes, recentVaccsRes] = await Promise.all([
          api.get('/cases?per_page=5'),
          api.get('/vaccinations?per_page=5')
        ]);

        if (mapRes?.data?.statistics?.by_barangay) {
          setMapIncidentStats(mapRes.data.statistics.by_barangay);
        }

        setStats({
          totalPatients: patientsRes.data?.total || 0,
          activeCases: casesRes.data?.active_cases || 0,
          pendingVaccinations: vaccineRes.data?.pending || 0,
          todayQueue: queueRes.data?.waiting || 0,
          completedCases: casesRes.data?.completed_cases || 0,
          followupPatients: vaccineRes.data?.total_scheduled || 0,
          biteCases: casesRes.data?.total_cases || 0,
          newToday: queueRes.data?.total || 0,
          casesList: recentCasesRes.data?.data || [],
          vaccinationsList: recentVaccsRes.data?.data || [],
        });
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      }
    };

    fetchStats();
  }, [setupCheckDone, isLoading]);

  // 2. Fetch Municipalities from registration PSGC API
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    fetch(`${PSGC_API}/provinces/${MIS_OR_CODE}/cities-municipalities/`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: PsgcItem[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setMunicipalities(data.sort((a, b) => a.name.localeCompare(b.name)));
        }
      })
      .catch(() => {
        setMunicipalities(MISAMIS_ORIENTAL_MUNICIPALITIES);
      })
      .finally(() => clearTimeout(timer));
  }, []);

  // 3. Fetch Barangays for selected municipality using registration PSGC API & compute risk
  useEffect(() => {
    if (!selectedMunicipality) return;
    setLoadingBarangays(true);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    fetch(`${PSGC_API}/cities-municipalities/${selectedMunicipality}/barangays/`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: PsgcItem[]) => {
        const brgyList = Array.isArray(data) && data.length > 0 ? data : FALLBACK_BARANGAYS[selectedMunicipality] || [];
        processBarangayRisk(brgyList);
      })
      .catch(() => {
        const fallbacks = FALLBACK_BARANGAYS[selectedMunicipality] || [
          { code: '1', name: 'Poblacion' },
          { code: '2', name: 'Baluarte' },
          { code: '3', name: 'Natumolan' },
          { code: '4', name: 'Casinglot' },
          { code: '5', name: 'Sta. Ana' },
          { code: '6', name: 'Sugbongcogon' },
        ];
        processBarangayRisk(fallbacks);
      })
      .finally(() => {
        clearTimeout(timer);
        setLoadingBarangays(false);
      });

    function processBarangayRisk(brgyItems: PsgcItem[]) {
      // Clean and match with real incident counts or realistic base distributions
      const simulatedCounts: Record<string, number> = {
        'Poblacion': 32,
        'Baluarte': 24,
        'Natumolan': 16,
        'Casinglot': 11,
        'Santa Ana': 6,
        'Sta. Ana': 6,
        'Sugbongcogon': 2,
        'Katipunan': 22,
        'Poblacion 1': 15,
        'San Martin': 9,
        'Dayawan': 3,
        'Lower Jasaan': 18,
        'Upper Jasaan': 12,
        'Aplaya': 7,
        'Bobontugan': 2,
      };

      const computed = brgyItems.slice(0, 5).map((b, idx) => {
        const matchedCount =
          mapIncidentStats[b.name] !== undefined
            ? mapIncidentStats[b.name]
            : simulatedCounts[b.name] !== undefined
            ? simulatedCounts[b.name]
            : Math.max(28 - idx * 6, 2);

        let risk: 'High' | 'Moderate' | 'Low' = 'Low';
        if (matchedCount >= 18) risk = 'High';
        else if (matchedCount >= 8) risk = 'Moderate';

        return {
          name: b.name,
          count: matchedCount,
          risk,
        };
      });

      // Sort descending by incident count so top 5 high risks stand out
      computed.sort((a, b) => b.count - a.count);
      setBarangayRiskList(computed);
    }
  }, [selectedMunicipality, mapIncidentStats]);

  // Background setup check (non-blocking if logged in)
  useEffect(() => {
    const checkSetupNeeded = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/setup/check-needed`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.needs_setup === true) {
            window.location.href = ROUTES.SETUP;
            return;
          }
        }
      } catch (error) {
        console.error('Setup check failed:', error);
      } finally {
        setSetupCheckDone(true);
      }
    };
    checkSetupNeeded();
  }, []);

  // Background user session refresh (non-blocking)
  useEffect(() => {
    const loadUserData = async () => {
      if (!isAuthenticated()) {
        window.location.href = ROUTES.LOGIN;
        return;
      }
      const userData = localStorage.getItem('userData');
      const clinicData = localStorage.getItem('clinicData');
      const localUser = userData ? JSON.parse(userData) : null;
      const localClinic = clinicData ? JSON.parse(clinicData) : (localUser?.clinic || null);

      setUser(localUser);
      setClinic(localClinic);
      setIsLoading(false);

      if (localUser?.role === 'admin') {
        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch(`${API_BASE_URL}/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });
          if (response.ok) {
            const freshData = await response.json();
            localStorage.setItem('userData', JSON.stringify(freshData));
            if (freshData.clinic) {
              localStorage.setItem('clinicData', JSON.stringify(freshData.clinic));
            }
            setUser(freshData);
            setClinic(freshData.clinic);
          }
        } catch (error) {
          console.error('Failed to fetch fresh user data:', error);
        }
      }
    };
    loadUserData();
  }, [setupCheckDone]);

  if (!setupCheckDone || isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: '1rem'
      }}>
        <div style={{
          width: '40px', height: '40px',
          border: '4px solid #e5e7eb', borderTop: '4px solid #10b981',
          borderRadius: '50%', animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#6b7280' }}>Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    window.location.href = ROUTES.LOGIN;
    return null;
  }

  // Backend uses 'is_setup_complete' on the clinic model
  const setupComplete =
    user?.clinic?.is_setup_complete ??
    clinic?.is_setup_complete ??
    false;
  if (!setupComplete && user?.role === 'admin') {
    window.location.href = ROUTES.SETUP;
    return null;
  }

  const now = new Date();

  return (
    <DashboardLayout pageTitle="Dashboard">
      <div
        className="sd-dashboard-container"
        data-walkthrough="dashboard-overview"
        data-tour="dashboard-overview"
        style={{ width: '100%', minHeight: '100%' }}
      >
        <div className="sd-dash-header" data-walkthrough="dashboard-header" style={{ marginTop: '4px', marginBottom: '14px' }}>
        <div data-walkthrough="dashboard-welcome" data-tour="dashboard-welcome">
          <Typography
            component="h1"
            sx={{
              fontFamily: 'Poppins',
              fontSize: '22px',
              fontWeight: 600,
              lineHeight: 1.25,
              letterSpacing: '-0.5px',
              color: 'var(--text-h, #111827)',
              mb: 0.5,
            }}
          >
            Animal Bite Treatment Center
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Poppins',
              fontSize: '13px',
              color: 'var(--text-secondary, #6b7280)',
              m: 0,
            }}
          >
            Overview · {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Typography>
        </div>
        <div className="sd-dash-tabs" data-walkthrough="dashboard-tabs" data-tour="dashboard-tabs" style={{ flexWrap: 'wrap' }}>
          <button
            className={`sd-dash-tab ${activeTab === 'overview' ? 'sd-dash-tab--active' : ''}`}
            onClick={() => setActiveTab('overview')}
            data-walkthrough="dashboard-tab-overview"
          >
            Overview
          </button>
          <button
            className={`sd-dash-tab ${activeTab === 'cases' ? 'sd-dash-tab--active' : ''}`}
            onClick={() => setActiveTab('cases')}
            data-walkthrough="dashboard-tab-cases"
          >
            Cases
          </button>
          <button
            className={`sd-dash-tab ${activeTab === 'vaccinations' ? 'sd-dash-tab--active' : ''}`}
            onClick={() => setActiveTab('vaccinations')}
            data-walkthrough="dashboard-tab-vaccinations"
          >
            Vaccinations
          </button>
          {canManageAnnouncements && <button
            className={`sd-dash-tab ${activeTab === 'announcements' ? 'sd-dash-tab--active' : ''}`}
            onClick={() => setActiveTab('announcements')}
          >
            Announcements
          </button>}
        </div>
      </div>

      {activeTab === 'announcements' && canManageAnnouncements && (
        <section aria-label="Staff announcement management">
          <Suspense fallback={<p role="status">Loading announcement controls…</p>}>
            <AnnouncementManager />
          </Suspense>
        </section>
      )}

      {activeTab === 'overview' && (
        <>
          {/* ── TOP SECTION: Large Calendar Card (Left) + 8 Stat Cards (Right) ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(400px, 1.2fr) 1fr',
              gap: '16px',
              marginBottom: '16px',
              alignItems: 'stretch',
            }}
            className="sd-top-arrangement"
          >
            {/* Bigger Calendar Card on the Left */}
            <SdCalendar />

            {/* Rearranged 2×3 Core Overview KPIs on the Right */}
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div
                className="sd-overview-kpi-grid"
                data-walkthrough="dashboard-stat-cards" data-tour="dashboard-summary-cards"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  flex: 1,
                }}
              >
                {/* Row 1: Patients & Queue */}
                <SdCard color="purple" label="Total Patients" value={stats.totalPatients.toString()} sub="Registered" />
                <SdCard color="teal" label="Today's Queue" value={stats.todayQueue.toString()} sub="Waiting" />

                {/* Row 2: Bite Cases */}
                <SdCard color="green" label="Total Bite Cases" value={stats.biteCases.toString()} sub="Reported cases" />
                <SdCard color="blue" label="Active Cases" value={stats.activeCases.toString()} sub="Ongoing treatment" />

                {/* Row 3: Outcomes & Doses */}
                <SdCard color="violet" label="Completed Cases" value={stats.completedCases.toString()} sub="Treatment finished" />
                <SdCard color="indigo" label="Pending Doses" value={stats.pendingVaccinations.toString()} sub="Scheduled" />
              </div>
            </div>
          </div>

          {/* ── SHARED CONTAINER: Filters (Top) + Cases Over Time & Vaccination Trend (Side-by-Side Below) ── */}
          <div
            className="sd-chart-card"
            style={{
              marginBottom: '18px',
              borderRadius: '20px',
              padding: '20px 24px',
            }}
          >
            {/* Filters Section at the Top */}
            <div style={{ marginBottom: '20px' }} data-walkthrough="dashboard-filters" data-tour="dashboard-filters">
              <p className="sd-filter-title" style={{ marginBottom: '14px', fontSize: '13.5px', fontWeight: 750 }}>
                Filters
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '14px',
                  alignItems: 'flex-end',
                }}
                className="sd-filters-bar-grid"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }} data-walkthrough="filter-role">
                  <span className="sd-filter-label">
                    Role
                  </span>
                  <select className="sd-filter-select" style={{ width: '100%' }}>
                    <option>All</option><option>Admin</option><option>Triage</option>
                    <option>Registration</option><option>Treatment</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }} data-walkthrough="filter-status">
                  <span className="sd-filter-label">
                    Status
                  </span>
                  <select className="sd-filter-select" style={{ width: '100%' }}>
                    <option>All</option><option>Ongoing</option>
                    <option>Completed</option><option>Abandoned</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }} data-walkthrough="filter-date-range">
                  <span className="sd-filter-label">
                    Date Range
                  </span>
                  <select className="sd-filter-select" style={{ width: '100%' }}>
                    <option>This Month</option><option>Last 3 Months</option>
                    <option>Last 6 Months</option><option>This Year</option>
                  </select>
                </div>

                <div data-walkthrough="btn-goto-patients">
                  <button
                    className="sd-filter-link"
                    onClick={() => { navigate('/patients'); }}
                    style={{ padding: '8px 12px', fontSize: '12.5px', justifyContent: 'center' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                    </svg>
                    Patients
                  </button>
                </div>

                <div data-walkthrough="btn-goto-cases">
                  <button
                    className="sd-filter-link"
                    onClick={() => { navigate('/bite-cases'); }}
                    style={{ padding: '8px 12px', fontSize: '12.5px', justifyContent: 'center' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    Cases
                  </button>
                </div>
              </div>
            </div>

            {/* Divider line between Filters and Charts */}
            <div style={{ height: '1px', background: 'var(--table-row-border, #f1f5f9)', width: '100%', marginBottom: '20px' }} />

            {/* Cases Over Time & Vaccination Trend Side-by-Side Below Filters */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
              }}
              className="sd-analytics-row"
              data-walkthrough="dashboard-trends"
              data-tour="dashboard-trends"
            >
              {/* Cases Over Time */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '230px',
                }}
                data-walkthrough="chart-cases-over-time"
              >
                <p className="sd-chart-title" style={{ marginBottom: '12px' }}>Cases Over Time <span>(last 6 months)</span></p>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <SdLineChart color="#0d9488" />
                </div>
              </div>

              {/* Vaccination Trend */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '230px',
                }}
                data-walkthrough="chart-vaccination-trend"
              >
                <p className="sd-chart-title" style={{ marginBottom: '12px' }}>Vaccination Trend <span>(last 6 months)</span></p>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <SdLineChart
                    color="#10b981"
                    unitLabel="doses"
                    points={[32, 48, 44, 62, 58, 74, 68, 86, 79, 92, 88, 96]}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Case Distribution (Left) & High & Low Risk Places (Right) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '18px',
            }}
            className="sd-analytics-row"
            data-walkthrough="dashboard-risk-row"
            data-tour="dashboard-risk-row"
          >
            {/* Case Distribution */}
            <div
              className="sd-chart-card abtc-scroll-reveal"
              data-walkthrough="chart-case-distribution"
              style={{
                borderRadius: '20px',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '235px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <p className="sd-chart-title" style={{ margin: 0 }}>
                  Case Distribution
                </p>
                <div
                  data-walkthrough="case-dist-period-controls"
                  style={{
                    display: 'flex',
                    gap: '3px',
                    background: '#f1f5f9',
                    padding: '3px',
                    borderRadius: '999px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((period) => {
                    const isActive = caseDistPeriod === period;
                    return (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setCaseDistPeriod(period)}
                        style={{
                          padding: '4px 12px',
                          fontSize: '11px',
                          fontWeight: isActive ? 600 : 500,
                          borderRadius: '999px',
                          border: 'none',
                          background: isActive ? '#065f46' : 'transparent',
                          color: isActive ? '#ffffff' : 'var(--text-secondary, #64748b)',
                          boxShadow: isActive ? '0 2px 6px rgba(6, 95, 70, 0.25)' : 'none',
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                          transition: 'all 0.18s ease',
                          fontFamily: 'inherit',
                          lineHeight: 1.3,
                        }}
                      >
                        {period}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SdDonutChart
                  data={
                    caseDistPeriod === 'daily'
                      ? [
                          { label: 'Category I',   pct: 20, color: '#a7e3c6' },
                          { label: 'Category II',  pct: 50, color: '#34b584' },
                          { label: 'Category III', pct: 30, color: '#0f766e' },
                        ]
                      : caseDistPeriod === 'weekly'
                      ? [
                          { label: 'Category I',   pct: 30, color: '#a7e3c6' },
                          { label: 'Category II',  pct: 45, color: '#34b584' },
                          { label: 'Category III', pct: 25, color: '#0f766e' },
                        ]
                      : caseDistPeriod === 'yearly'
                      ? [
                          { label: 'Category I',   pct: 38, color: '#a7e3c6' },
                          { label: 'Category II',  pct: 42, color: '#34b584' },
                          { label: 'Category III', pct: 20, color: '#0f766e' },
                        ]
                      : [
                          { label: 'Category I',   pct: 35, color: '#a7e3c6' },
                          { label: 'Category II',  pct: 40, color: '#34b584' },
                          { label: 'Category III', pct: 25, color: '#0f766e' },
                        ]
                  }
                />
              </div>
            </div>

            {/* High & Low Risk Places Card with Registration PSGC API */}
            <div
              className="sd-chart-card abtc-scroll-reveal"
              data-walkthrough="chart-risk-places"
              style={{
                borderRadius: '20px',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '235px',
              }}
            >
              {/* Card Header with Title, Registration Municipality Dropdown, and Bite Map Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p className="sd-chart-title" style={{ margin: 0 }}>
                    High & Low Risk Places <span>(by barangay)</span>
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Registration PSGC Municipality Dropdown Selector */}
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }} data-walkthrough="risk-places-municipality">
                    <select
                      value={selectedMunicipality}
                      onChange={(e) => setSelectedMunicipality(e.target.value)}
                      disabled={loadingBarangays}
                      className="sd-filter-select"
                      style={{
                        padding: '5px 26px 5px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: 'auto',
                      }}
                    >
                      {municipalities.map((mun) => (
                        <option key={mun.code} value={mun.code}>
                          {mun.name}
                        </option>
                      ))}
                    </select>
                    {/* Dropdown chevron icon */}
                    <span
                      style={{
                        position: 'absolute',
                        right: '8px',
                        pointerEvents: 'none',
                        fontSize: '9px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {/* Bite Map link button */}
                  <button
                    type="button"
                    data-walkthrough="btn-risk-places-bitemap"
                    onClick={() => navigate((ROUTES as any).BITE_MAP || '/bite-cases/map')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 9px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#475569',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.color = '#0f172a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.color = '#475569';
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                      <line x1="8" y1="2" x2="8" y2="18"></line>
                      <line x1="16" y1="6" x2="16" y2="22"></line>
                    </svg>
                    Bite Map
                  </button>
                </div>
              </div>

              {/* Main Barangay Risk Bar Chart */}
              <div style={{ flex: 1, minHeight: 0 }}>
                {loadingBarangays ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    Loading barangays...
                  </div>
                ) : (
                  <SdBarChart
                    data={barangayRiskList.map((b) => ({
                      label: b.name,
                      value: b.count,
                      riskLevel: b.risk,
                      color:
                        b.risk === 'High'
                          ? '#f2a2a2' // Muted Pastel Coral for High Risk
                          : b.risk === 'Moderate'
                          ? '#f3cc86' // Muted Pastel Warm Sand for Moderate Risk
                          : '#8ed7b5', // Muted Pastel Sage Mint for Low Risk
                    }))}
                  />
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'cases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} data-walkthrough="cases-tab-view">
          <div className="sd-cards-grid" data-walkthrough="cases-tab-cards">
            <SdCard color="green" label="Total Bite Cases" value={stats.biteCases.toString()} sub="Reported cases" />
            <SdCard color="blue" label="Active Cases" value={stats.activeCases.toString()} sub="Ongoing treatment" />
            <SdCard color="violet" label="Completed Cases" value={stats.completedCases.toString()} sub="Treatment finished" />
          </div>

          <div className="sd-chart-card" data-walkthrough="table-recent-cases" style={{ borderRadius: '20px', padding: '24px' }}>
            <p style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: 'var(--text-h)' }}>Recent Bite Incident Cases</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--table-border)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Patient</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Bite Date</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Animal Type</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Category</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.casesList.length > 0 ? (
                    stats.casesList.map((c: any) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--table-row-border)' }}>
                        <td style={{ padding: '12px 16px', color: 'var(--text-h)', fontWeight: 600 }}>{c.patient?.name || '—'}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text)' }}>{c.bite_date || '—'}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text)', textTransform: 'capitalize' }}>{c.animal_type || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                            background: c.severity === 'Category III' ? '#fee2e2' : c.severity === 'Category II' ? '#fef3c7' : '#ecfdf5',
                            color: c.severity === 'Category III' ? '#ef4444' : c.severity === 'Category II' ? '#d97706' : '#10b981'
                          }}>
                            {c.severity || 'Category II'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                            background: c.status === 'completed' ? '#ecfdf5' : '#eff6ff',
                            color: c.status === 'completed' ? '#10b981' : '#3b82f6'
                          }}>
                            {c.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>No recent cases recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'vaccinations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} data-walkthrough="vaccinations-tab-view">
          <div className="sd-cards-grid" data-walkthrough="vaccinations-tab-cards">
            <SdCard color="indigo" label="Pending Doses" value={stats.pendingVaccinations.toString()} sub="Scheduled" />
            <SdCard color="purple" label="Total Scheduled" value={stats.followupPatients.toString()} sub="Doses tracked" />
            <SdCard color="teal" label="Queue Count" value={stats.todayQueue.toString()} sub="Today waiting" />
          </div>

          <div className="sd-chart-card" data-walkthrough="table-recent-vaccinations" style={{ borderRadius: '20px', padding: '24px' }}>
            <p style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: 'var(--text-h)' }}>Recent Vaccinations & Scheduled Doses</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--table-border)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Patient</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Vaccine Brand</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Batch / Dose</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Date Administered</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.vaccinationsList.length > 0 ? (
                    stats.vaccinationsList.map((v: any) => (
                      <tr key={v.id} style={{ borderBottom: '1px solid var(--table-row-border)' }}>
                        <td style={{ padding: '12px 16px', color: 'var(--text-h)', fontWeight: 600 }}>{v.patient?.name || '—'}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text)' }}>{v.vaccine_brand || '—'}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text)' }}>{v.dose_number || 'Dose 1'}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text)' }}>{v.administered_at ? new Date(v.administered_at).toLocaleDateString() : '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                            background: '#ecfdf5', color: '#10b981'
                          }}>
                            Done
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>No recent vaccinations found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}

function SdCalendar() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [closeOnPhHolidays, setCloseOnPhHolidays] = useState<boolean>(true);
  const [clinicHolidays, setClinicHolidays] = useState<CalendarHoliday[]>([]);
  const [specialOpenDates, setSpecialOpenDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    api
      .get('/clinics/schedule')
      .then((res) => {
        if (!active) return;
        const closePh = res.data?.clinic?.close_on_ph_holidays ?? true;
        setCloseOnPhHolidays(Boolean(closePh));

        const exceptions = Array.isArray(res.data?.exceptions) ? res.data.exceptions : [];
        const closedDates: CalendarHoliday[] = [];
        const openOverrides = new Set<string>();

        exceptions.forEach((exc: any) => {
          if (!exc.exception_date) return;
          const dateStr = String(exc.exception_date).slice(0, 10);
          if (exc.is_open) {
            openOverrides.add(dateStr);
          } else {
            closedDates.push({
              date: dateStr,
              name: exc.reason?.trim() || 'Clinic Holiday / Closed',
              isClinicOverride: true,
            });
          }
        });

        setClinicHolidays(closedDates);
        setSpecialOpenDates(openOverrides);
      })
      .catch(() => {
        // Non-fatal: keep default PH regular holidays
      });
    return () => {
      active = false;
    };
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const shortMonthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const monthPrefix = `${year}-${pad(month + 1)}-`;

  // Always display PH Regular Holidays on the calendar;
  // Operating Schedule (close_on_ph_holidays + manual overrides) decides whether the clinic is Open or Closed.
  type ResolvedCalendarHoliday = CalendarHoliday & { isClosed: boolean };
  const holidayMap = new Map<string, ResolvedCalendarHoliday>();

  getPhilippineRegularHolidays(year).forEach((h) => {
    const isClosed = specialOpenDates.has(h.date) ? false : closeOnPhHolidays;
    holidayMap.set(h.date, { ...h, isClosed });
  });

  clinicHolidays.forEach((h) => {
    holidayMap.set(h.date, { ...h, isClosed: true });
  });

  const monthHolidays = Array.from(holidayMap.values())
    .filter((h) => h.date.startsWith(monthPrefix))
    .sort((a, b) => a.date.localeCompare(b.date));

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const days: Array<{ day: number; isCurrent: boolean; isToday: boolean; holiday?: ResolvedCalendarHoliday }> = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, isCurrent: false, isToday: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === i;
    const dateKey = `${year}-${pad(month + 1)}-${pad(i)}`;
    days.push({ day: i, isCurrent: true, isToday, holiday: holidayMap.get(dateKey) });
  }
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, isCurrent: false, isToday: false });
  }

  return (
    <div
      className="sd-chart-card"
      data-walkthrough="dashboard-calendar"
      data-tour="dashboard-calendar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '340px',
        borderRadius: '20px',
        padding: '22px 24px',
        justifyContent: 'space-between',
      }}
    >
      {/* Centered Month & Year Header with Flanking Arrows */}
      <div
        data-walkthrough="calendar-nav"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '22px',
          marginBottom: '18px',
        }}
      >
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          style={{
            background: 'transparent',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isDark ? '#a7f3d0' : '#475569',
            fontSize: '20px',
            fontWeight: 600,
            lineHeight: 1,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)';
            (e.currentTarget as HTMLButtonElement).style.color = isDark ? '#ffffff' : '#047857';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = isDark ? '#a7f3d0' : '#475569';
          }}
        >
          ‹
        </button>

        <p
          className="sd-chart-title"
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-h, #111827)',
            minWidth: '185px',
            textAlign: 'center',
          }}
        >
          {monthNames[month]} {year}
        </p>

        <button
          onClick={nextMonth}
          aria-label="Next month"
          style={{
            background: 'transparent',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isDark ? '#a7f3d0' : '#475569',
            fontSize: '20px',
            fontWeight: 600,
            lineHeight: 1,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)';
            (e.currentTarget as HTMLButtonElement).style.color = isDark ? '#ffffff' : '#047857';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = isDark ? '#a7f3d0' : '#475569';
          }}
        >
          ›
        </button>
      </div>

      {/* Uppercase Weekday Row with Divider */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          textAlign: 'center',
          gap: '4px',
          paddingBottom: '12px',
          marginBottom: '10px',
          borderBottom: isDark ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid #e5e7eb',
        }}
      >
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => (
          <span
            key={i}
            style={{
              fontSize: '11.5px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: 'var(--text-h, #111827)',
            }}
          >
            {d}
          </span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: '8px', columnGap: '4px', flex: 1, alignItems: 'center' }}>
        {days.map((item, idx) => {
          const isHoliday = Boolean(item.isCurrent && item.holiday);
          const defaultBg = item.isToday ? '#10b981' : 'transparent';
          const defaultColor = item.isToday
            ? '#ffffff'
            : isHoliday
              ? (isDark ? '#f87171' : '#dc2626')
              : item.isCurrent
                ? 'var(--text-h)'
                : 'var(--text-secondary)';
          const defaultBorder = item.isToday ? '1px solid #10b981' : '1px solid transparent';

          return (
            <div
              key={idx}
              title={item.holiday ? `${item.holiday.name} — ${item.holiday.isClosed ? 'Clinic Closed' : 'Clinic Open'}` : undefined}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                margin: '0 auto',
                fontSize: '13.5px',
                borderRadius: '50%',
                color: defaultColor,
                opacity: item.isCurrent ? 1 : 0.35,
                background: defaultBg,
                fontWeight: item.isToday || isHoliday ? 700 : 500,
                boxShadow: item.isToday ? '0 2px 8px rgba(16,185,129,0.4)' : 'none',
                border: defaultBorder,
                cursor: item.isCurrent ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                if (!item.isToday && item.isCurrent) {
                  if (isHoliday) {
                    (e.currentTarget as HTMLDivElement).style.color = isDark ? '#fca5a5' : '#b91c1c';
                  } else if (isDark) {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(16, 185, 129, 0.32)';
                    (e.currentTarget as HTMLDivElement).style.color = '#ffffff';
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(52, 211, 153, 0.65)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.4)';
                  } else {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(16, 185, 129, 0.15)';
                    (e.currentTarget as HTMLDivElement).style.color = '#047857';
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(16, 185, 129, 0.35)';
                  }
                }
              }}
              onMouseLeave={e => {
                if (!item.isToday && item.isCurrent) {
                  (e.currentTarget as HTMLDivElement).style.background = defaultBg;
                  (e.currentTarget as HTMLDivElement).style.color = defaultColor;
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }
              }}
            >
              <span style={{ lineHeight: 1.1 }}>{item.day}</span>
            </div>
          );
        })}
      </div>

      {/* Compact Holiday List for the Current Month */}
      <div
        style={{
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: isDark ? '1px solid rgba(16, 185, 129, 0.18)' : '1px solid #f1f5f9',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: isDark ? '#94a3b8' : '#64748b',
            }}
          >
            Holidays · {monthNames[month]}
          </span>
          {monthHolidays.length > 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: isDark ? '#f87171' : '#dc2626',
              }}
            >
              {monthHolidays.length} {monthHolidays.length === 1 ? 'day' : 'days'}
            </span>
          )}
        </div>

        {monthHolidays.length === 0 ? (
          <p style={{ margin: 0, fontSize: '12px', color: isDark ? '#64748b' : '#94a3b8' }}>
            No holidays scheduled this month.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '8px',
            }}
          >
            {monthHolidays.map((h) => {
              const dayNum = Number(h.date.slice(8, 10));
              return (
                <div
                  key={h.date}
                  title={`${h.name} — ${h.isClosed ? 'Clinic Closed' : 'Clinic Open'}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '7px 10px',
                    borderRadius: '10px',
                    background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #f1f5f9',
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      width: '3px',
                      height: '18px',
                      borderRadius: '99px',
                      background: isDark ? '#f87171' : '#ef4444',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: isDark ? '#f87171' : '#dc2626',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      minWidth: '42px',
                    }}
                  >
                    {shortMonthNames[month]} {dayNum}
                  </span>
                  <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--text-h, #111827)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h.name}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: h.isClosed
                          ? (isDark ? '#fca5a5' : '#b91c1c')
                          : (isDark ? '#34d399' : '#059669'),
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      · {h.isClosed ? 'Closed' : 'Open'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SdCard({ color, label, value, sub }: { color: string; label: string; value: string; sub: string }) {
  const autoId = `card-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className={`sd-card sd-card--${color}`} data-walkthrough={autoId} data-card-label={label}>
      <p className="sd-card-label">{label}</p>
      <p className="sd-card-value">{value}</p>
      <p className="sd-card-sub">{sub}</p>
    </div>
  );
}

function SdLineChart({
  color = '#3b82f6',
  points = [20, 45, 30, 60, 40, 75, 55, 80, 65, 90, 70, 85],
  unitLabel = 'cases',
}: {
  color?: string;
  points?: number[];
  unitLabel?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const { ref: scrollRef, inView } = useChartInView<HTMLDivElement>({ threshold: 0.2 });

  const w = 420;
  const h = 165;
  const padLeft = 28;
  const padRight = 14;
  const padTop = 22;
  const padBottom = 24;
  const innerW = w - padLeft - padRight;
  const innerH = h - padTop - padBottom;
  const bottomY = padTop + innerH;

  const maxV = Math.max(...points, 10);
  const roundedMax = Math.ceil(maxV / 20) * 20;

  const coords = points.map((v, i) => ({
    x: padLeft + (i / Math.max(1, points.length - 1)) * innerW,
    y: padTop + (1 - v / roundedMax) * innerH,
    value: v,
  }));

  // Smooth cubic-bezier spline
  const path = coords.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[i - 1];
    const cx = prev.x + (pt.x - prev.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');

  const area =
    coords.length > 0
      ? `${path} L ${coords[coords.length - 1].x} ${bottomY} L ${coords[0].x} ${bottomY} Z`
      : '';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hovered = hoveredIdx !== null ? coords[hoveredIdx] : null;
  const tooltipX = hovered ? Math.min(Math.max(hovered.x, padLeft + 42), w - padRight - 42) : 0;
  const tooltipY = hovered ? Math.max(4, hovered.y - 40) : 0;
  const hitW = innerW / Math.max(1, coords.length);

  return (
    <div
      ref={scrollRef}
      className="abtc-scroll-watch"
      data-in-view={inView ? 'true' : 'false'}
      style={{ width: '100%', height: '100%' }}
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="sd-line-chart"
        role="img"
        aria-label={`Trend chart (${unitLabel})`}
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
      <defs>
        <linearGradient id={`sdGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={isDark ? '0.32' : '0.24'} />
          <stop offset="80%" stopColor={color} stopOpacity="0.04" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Subtle Y gridlines */}
      {[0, 0.5, 1].map((ratio, idx) => {
        const y = padTop + innerH * (1 - ratio);
        const tickVal = Math.round(roundedMax * ratio);
        return (
          <g key={idx}>
            <line
              x1={padLeft}
              y1={y}
              x2={w - padRight}
              y2={y}
              stroke={isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.22)'}
              strokeDasharray={ratio === 0 ? undefined : '3 3'}
              strokeWidth="1"
            />
            <text
              x={padLeft - 6}
              y={y + 3}
              textAnchor="end"
              fontSize="8.5"
              fill="var(--text-secondary, #94a3b8)"
              fontWeight="500"
            >
              {tickVal}
            </text>
          </g>
        );
      })}

      {/* Animated Area Reveal */}
      <path d={area} fill={`url(#sdGrad-${uid})`} className="abtc-svg-area-reveal" />

      {/* Animated Line Draw-In */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="abtc-svg-line-draw"
        style={{ '--line-length': 900 } as React.CSSProperties}
      />

      {/* Hover Vertical Crosshair */}
      {hovered && (
        <line
          x1={hovered.x}
          y1={padTop}
          x2={hovered.x}
          y2={bottomY}
          stroke={color}
          strokeOpacity="0.35"
          strokeDasharray="3 3"
          strokeWidth="1.2"
        />
      )}

      {/* Interactive Points & Labels */}
      {coords.map((pt, i) => {
        const isActive = hoveredIdx === i;
        return (
          <g
            key={i}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={pt.x - hitW / 2}
              y={padTop}
              width={hitW}
              height={innerH + 18}
              fill="transparent"
            />
            {isActive && (
              <circle cx={pt.x} cy={pt.y} r="8" fill={color} fillOpacity="0.18" />
            )}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={isActive ? 4.5 : 2.6}
              fill={isDark ? '#111827' : '#ffffff'}
              stroke={color}
              strokeWidth={isActive ? 2.5 : 1.8}
              className="abtc-svg-point"
              style={{ '--pt-delay': `${140 + i * 35}ms` } as React.CSSProperties}
            />
            {i % 2 === 0 && (
              <text
                x={pt.x}
                y={h - 5}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight={isActive ? 700 : 500}
                fill={isActive ? 'var(--text-h, #0f172a)' : 'var(--text-secondary, #9ca3af)'}
              >
                {months[i]}
              </text>
            )}
          </g>
        );
      })}

      {/* Floating Tooltip */}
      {hovered && hoveredIdx !== null && (
        <g transform={`translate(${tooltipX}, ${tooltipY})`} className="abtc-tooltip">
          <rect
            x="-42"
            y="0"
            width="84"
            height="30"
            rx="8"
            fill={isDark ? '#0f172a' : '#1e293b'}
            filter="drop-shadow(0 4px 10px rgba(15, 23, 42, 0.25))"
          />
          <text x="0" y="13" textAnchor="middle" fontSize="8.5" fill="#94a3b8" fontWeight="600">
            {months[hoveredIdx]}
          </text>
          <text x="0" y="24" textAnchor="middle" fontSize="10" fill="#ffffff" fontWeight="700">
            {hovered.value} {unitLabel}
          </text>
        </g>
      )}
      </svg>
    </div>
  );
}

function SdDonutChart({ data }: { data: { label: string; pct: number; color: string }[] }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const { ref: scrollRef, inView } = useChartInView<HTMLDivElement>({ threshold: 0.2 });

  const r = 54;
  const cx = 78;
  const cy = 78;
  const stroke = 23;
  const circ = 2 * Math.PI * r;
  const gapPx = data.length > 1 ? 2.5 : 0;

  let offset = 0;
  const slices = data.map((d) => {
    const rawLen = (d.pct / 100) * circ;
    const len = Math.max(0, rawLen - gapPx);
    const s = { ...d, dasharray: `${len} ${circ - len}`, offset };
    offset += rawLen;
    return s;
  });

  const activeSlice = activeIdx !== null ? slices[activeIdx] : null;
  const totalPct = data.reduce((a, d) => a + d.pct, 0);
  const dataKey = data.map((d) => d.pct).join('-');

  return (
    <div
      ref={scrollRef}
      className="sd-donut-wrap abtc-scroll-watch"
      data-in-view={inView ? 'true' : 'false'}
      style={{ width: '100%', justifyContent: 'center', gap: '22px' }}
    >
      <div style={{ position: 'relative', width: cx * 2, height: cy * 2, flexShrink: 0 }}>
        <svg
          key={dataKey}
          viewBox={`0 0 ${cx * 2} ${cy * 2}`}
          width={cx * 2}
          height={cy * 2}
          role="img"
          aria-label="Case distribution donut chart"
          style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
        >
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={isDark ? 'rgba(255, 255, 255, 0.07)' : '#f1f5f9'}
            strokeWidth={stroke}
          />
          {slices.map((s, i) => {
            const isActive = activeIdx === i;
            const isDimmed = activeIdx !== null && !isActive;
            return (
              <circle
                key={s.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={isActive ? stroke + 5 : stroke}
                strokeDasharray={s.dasharray}
                strokeDashoffset={-s.offset}
                opacity={isDimmed ? 0.35 : 1}
                className="abtc-donut-segment"
                style={
                  {
                    '--seg-dash': s.dasharray,
                    '--seg-delay': `${i * 95}ms`,
                    filter: isActive ? `drop-shadow(0 0 8px ${s.color}88)` : 'none',
                  } as React.CSSProperties
                }
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center Dynamic Readout */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontSize: activeSlice ? '20px' : '18px',
              fontWeight: 800,
              color: activeSlice ? activeSlice.color : 'var(--text-h, #0f172a)',
              lineHeight: 1.05,
              transition: 'color 0.2s ease',
            }}
          >
            {activeSlice ? `${activeSlice.pct}%` : `${totalPct}%`}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--text-secondary, #64748b)',
              marginTop: '2px',
            }}
          >
            {activeSlice ? activeSlice.label : 'Total'}
          </span>
        </div>
      </div>

      {/* Interactive Legend with Mini Bars */}
      <div className="sd-donut-legend" style={{ minWidth: '155px', gap: '8px' }}>
        {data.map((d, i) => {
          const isActive = activeIdx === i;
          return (
            <div
              key={`${dataKey}-${d.label}`}
              role="button"
              tabIndex={0}
              data-active={isActive ? 'true' : 'false'}
              className="abtc-interactive-row"
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
              onFocus={() => setActiveIdx(i)}
              onBlur={() => setActiveIdx(null)}
              style={{
                padding: '6px 10px',
                borderRadius: '10px',
                background: isActive
                  ? isDark
                    ? 'rgba(255, 255, 255, 0.07)'
                    : `${d.color}14`
                  : isDark
                    ? 'rgba(255, 255, 255, 0.025)'
                    : '#f8fafc',
                border: `1px solid ${isActive ? `${d.color}66` : 'var(--card-border, #f1f5f9)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: d.color,
                      boxShadow: isActive ? `0 0 8px ${d.color}` : 'none',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 600, color: 'var(--text-h, #0f172a)' }}>{d.label}</span>
                </div>
                <span style={{ fontWeight: 800, color: d.color }}>{d.pct}%</span>
              </div>
              <div
                style={{
                  marginTop: '5px',
                  height: '4px',
                  borderRadius: '999px',
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
                  overflow: 'hidden',
                }}
              >
                <div
                  className="abtc-bar-fill"
                  style={
                    {
                      height: '100%',
                      width: `${d.pct}%`,
                      borderRadius: '999px',
                      background: d.color,
                      '--bar-delay': `${100 + i * 80}ms`,
                    } as React.CSSProperties
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SdBarChart({
  data,
}: {
  data: { label: string; value: number; color?: string; subLabel?: string; riskLevel?: 'High' | 'Moderate' | 'Low' }[];
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const { ref: scrollRef, inView } = useChartInView<HTMLDivElement>({ threshold: 0.2 });

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  // Key changes whenever municipality / barangay list changes so bars smoothly rise up again
  const dataKey = data.map((d) => `${d.label}:${d.value}`).join('|');

  return (
    <div
      ref={scrollRef}
      className="abtc-scroll-watch"
      data-in-view={inView ? 'true' : 'false'}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-end', paddingTop: '10px' }}
    >
      {/* Modern Chart Canvas with Rising Vertical Bars */}
      <div
        key={dataKey}
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          height: '150px',
          paddingBottom: '2px',
          paddingLeft: '10px',
          paddingRight: '10px',
          borderBottom: `1.5px solid ${isDark ? 'rgba(148, 163, 184, 0.25)' : '#e2e8f0'}`,
          gap: '12px',
          position: 'relative',
        }}
      >
        {/* Subtle horizontal dashed grid lines */}
        {[25, 50, 75].map((pct) => (
          <div
            key={pct}
            style={{
              position: 'absolute',
              bottom: `${pct}%`,
              left: 0,
              right: 0,
              borderTop: `1px dashed ${isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.25)'}`,
              pointerEvents: 'none',
            }}
          />
        ))}

        {data.map((item, idx) => {
          const heightPct = Math.max(Math.round((item.value / maxValue) * 100), 14);
          const barColor = item.color || '#93c5fd';
          const textAccent =
            item.riskLevel === 'High'
              ? isDark ? '#fda4af' : '#e11d48'
              : item.riskLevel === 'Moderate'
              ? isDark ? '#fcd34d' : '#b45309'
              : item.riskLevel === 'Low'
              ? isDark ? '#86efac' : '#047857'
              : barColor;
          const isActive = hoveredIdx === idx;
          const isDimmed = hoveredIdx !== null && !isActive;

          return (
            <div
              key={`${item.label}-${idx}`}
              role="button"
              tabIndex={0}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onFocus={() => setHoveredIdx(idx)}
              onBlur={() => setHoveredIdx(null)}
              aria-label={`${item.label}: ${item.value} cases${item.riskLevel ? `, ${item.riskLevel} risk` : ''}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                maxWidth: '64px',
                height: '100%',
                justifyContent: 'flex-end',
                position: 'relative',
                zIndex: isActive ? 5 : 1,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {/* Floating Tooltip on Hover */}
              {isActive && (
                <div
                  className="abtc-tooltip"
                  style={{
                    position: 'absolute',
                    bottom: `calc(${heightPct}% + 22px)`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: isDark ? '#0f172a' : '#1e293b',
                    color: '#ffffff',
                    padding: '5px 9px',
                    borderRadius: '8px',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.25)',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    zIndex: 10,
                  }}
                >
                  {item.label}: <strong style={{ color: barColor }}>{item.value}</strong> cases
                </div>
              )}

              {/* Value Label above the bar */}
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: isActive ? textAccent : 'var(--text-h, #0f172a)',
                  marginBottom: '5px',
                  transition: 'color 0.2s ease, transform 0.2s ease',
                  transform: isActive ? 'translateY(-2px)' : 'none',
                }}
              >
                {item.value}
              </span>

              {/* Animated Rising Vertical Pastel Bar (goes UP from baseline!) */}
              <div
                style={{
                  width: '100%',
                  height: `calc(${heightPct}% - 20px)`,
                  minHeight: '14px',
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                <div
                  className="abtc-bar-rise"
                  style={
                    {
                      width: '100%',
                      height: '100%',
                      background: `linear-gradient(180deg, ${barColor} 0%, ${barColor}b8 100%)`,
                      borderRadius: '10px 10px 4px 4px',
                      border: `1px solid ${barColor}`,
                      boxShadow: isActive
                        ? `0 8px 20px -4px ${barColor}aa`
                        : `0 4px 10px -4px ${barColor}55`,
                      opacity: isDimmed ? 0.45 : 1,
                      position: 'relative',
                      overflow: 'hidden',
                      '--bar-delay': `${idx * 90}ms`,
                    } as React.CSSProperties
                  }
                >
                  {/* Soft glossy top accent edge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'rgba(255, 255, 255, 0.5)',
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* X-Axis Place & Risk Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: '9px', paddingLeft: '10px', paddingRight: '10px', gap: '12px' }}>
        {data.map((item, idx) => {
          const isActive = hoveredIdx === idx;
          return (
            <div
              key={`${item.label}-lbl-${idx}`}
              style={{
                flex: 1,
                maxWidth: '64px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '3px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 800 : 650,
                  color: isActive
                    ? item.riskLevel === 'High'
                      ? (isDark ? '#fda4af' : '#e11d48')
                      : item.riskLevel === 'Moderate'
                      ? (isDark ? '#fcd34d' : '#b45309')
                      : item.riskLevel === 'Low'
                      ? (isDark ? '#86efac' : '#047857')
                      : 'var(--text-h)'
                    : 'var(--text-h)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%',
                  transition: 'color 0.2s ease',
                }}
                title={item.label}
              >
                {item.label}
              </span>

              {item.riskLevel && (
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '1.5px 6px',
                    borderRadius: '999px',
                    lineHeight: 1.2,
                    background:
                      item.riskLevel === 'High'
                        ? isDark ? 'rgba(253, 164, 175, 0.16)' : '#fff1f2'
                        : item.riskLevel === 'Moderate'
                        ? isDark ? 'rgba(252, 211, 77, 0.16)' : '#fffbeb'
                        : isDark ? 'rgba(134, 239, 172, 0.16)' : '#f0fdf4',
                    color:
                      item.riskLevel === 'High'
                        ? isDark ? '#fda4af' : '#be123c'
                        : item.riskLevel === 'Moderate'
                        ? isDark ? '#fcd34d' : '#b45309'
                        : isDark ? '#86efac' : '#15803d',
                    border: `1px solid ${
                      item.riskLevel === 'High'
                        ? 'rgba(253, 164, 175, 0.55)'
                        : item.riskLevel === 'Moderate'
                        ? 'rgba(252, 211, 77, 0.6)'
                        : 'rgba(134, 239, 172, 0.6)'
                    }`,
                  }}
                >
                  {item.riskLevel}
                </span>
              )}

              {item.subLabel && !item.riskLevel && (
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1 }}>
                  {item.subLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SimpleDashboardPage;
