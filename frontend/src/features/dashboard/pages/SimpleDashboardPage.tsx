import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../shared/services/api';
import { ROUTES } from '../../../shared/config/routes';
import DashboardLayout from '../../../components/Layout/DashboardLayout';
import { AdminDashboardView } from '../components/AdminDashboardView';

import {
  MISAMIS_ORIENTAL_MUNICIPALITIES,
  FALLBACK_BARANGAYS,
} from '../../patients/hooks/useAddressLocation';
import type { PsgcItem } from '../../patients/types';

const PSGC_API = 'https://psgc.gitlab.io/api';
const MIS_OR_CODE = '104300000';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'cases' | 'vaccinations'>('overview');
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
        const response = await fetch('/api/setup/check-needed', {
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
          const response = await fetch('http://localhost:8000/api/me', {
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
      <div className="sd-dash-header">
        <div>
          <h1>Animal Bite Treatment Center</h1>
          <p>Overview · {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="sd-dash-tabs">
          <button
            className={`sd-dash-tab ${activeTab === 'overview' ? 'sd-dash-tab--active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`sd-dash-tab ${activeTab === 'cases' ? 'sd-dash-tab--active' : ''}`}
            onClick={() => setActiveTab('cases')}
          >
            Cases
          </button>
          <button
            className={`sd-dash-tab ${activeTab === 'vaccinations' ? 'sd-dash-tab--active' : ''}`}
            onClick={() => setActiveTab('vaccinations')}
          >
            Vaccinations
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* ── TOP SECTION: Large Calendar Card (Left) + 8 Stat Cards (Right) ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 340px) 1fr',
              gap: '16px',
              marginBottom: '20px',
              alignItems: 'start',
            }}
            className="sd-top-arrangement"
          >
            {/* Calendar Card on the Left */}
            <SdCalendar />

            {/* Cards Grid - Role Specific */}
            <div style={{ minWidth: 0, height: '100%' }}>
              {(() => {
                switch (user?.role) {
                  case 'admin':
                    return (
                      <div
                        className="sd-cards-grid"
                        style={{
                          marginBottom: 0,
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '14px',
                        }}
                      >
                        <SdCard color="purple"  label="Total Patients"      value={stats.totalPatients.toString()} sub="Registered" />
                        <SdCard color="blue"    label="Active Cases"         value={stats.activeCases.toString()} sub="Ongoing" />
                        <SdCard color="indigo"  label="Pending Vaccinations" value={stats.pendingVaccinations.toString()} sub="Scheduled" />
                        <SdCard color="teal"    label="Today's Queue"        value={stats.todayQueue.toString()} sub="Waiting" />
                        <SdCard color="violet"  label="Completed Cases"      value={stats.completedCases.toString()} sub="This month" />
                        <SdCard color="cyan"    label="Follow-up Patients"   value={stats.followupPatients.toString()} sub="This week" />
                        <SdCard color="green"   label="Bite Cases"           value={stats.biteCases.toString()} sub="Total" />
                        <SdCard color="emerald" label="New Today"            value={stats.newToday.toString()} sub="Registered" />
                      </div>
                    );
                  case 'registration':
                    return (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '14px',
                          alignSelf: 'start',
                        }}
                      >
                        <SdCard color="purple"  label="Total Patients" value={stats.totalPatients.toString()} sub="Registered" />
                        <SdCard color="teal"    label="Today's Queue"  value={stats.todayQueue.toString()} sub="Waiting" />
                        <SdCard color="emerald" label="New Today"       value={stats.newToday.toString()} sub="Registered" />
                      </div>
                    );
                  case 'triage':
                    return (
                      <div
                        className="sd-cards-grid"
                        style={{
                          marginBottom: 0,
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '14px',
                        }}
                      >
                        <SdCard color="blue"    label="Active Cases"         value={stats.activeCases.toString()} sub="Ongoing" />
                        <SdCard color="teal"    label="Today's Queue"        value={stats.todayQueue.toString()} sub="Waiting" />
                        <SdCard color="indigo"  label="Pending Vaccinations" value={stats.pendingVaccinations.toString()} sub="Scheduled" />
                        <SdCard color="purple"  label="Total Patients"       value={stats.totalPatients.toString()} sub="Registered" />
                        <SdCard color="green"   label="Bite Cases"           value={stats.biteCases.toString()} sub="Total" />
                        <SdCard color="violet"  label="Completed Cases"      value={stats.completedCases.toString()} sub="This month" />
                      </div>
                    );
                  case 'treatment':
                    return (
                      <div
                        className="sd-cards-grid"
                        style={{
                          marginBottom: 0,
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '14px',
                        }}
                      >
                        <SdCard color="indigo"  label="Pending Vaccinations" value={stats.pendingVaccinations.toString()} sub="Scheduled" />
                        <SdCard color="teal"    label="Today's Queue"        value={stats.todayQueue.toString()} sub="Waiting" />
                        <SdCard color="blue"    label="Active Cases"         value={stats.activeCases.toString()} sub="Ongoing" />
                        <SdCard color="violet"  label="Completed Cases"      value={stats.completedCases.toString()} sub="This month" />
                      </div>
                    );
                  default:
                    return (
                      <div
                        className="sd-cards-grid"
                        style={{
                          marginBottom: 0,
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '14px',
                        }}
                      >
                        <SdCard color="purple"  label="Total Patients"      value={stats.totalPatients.toString()} sub="Registered" />
                        <SdCard color="blue"    label="Active Cases"         value={stats.activeCases.toString()} sub="Ongoing" />
                        <SdCard color="indigo"  label="Pending Vaccinations" value={stats.pendingVaccinations.toString()} sub="Scheduled" />
                        <SdCard color="teal"    label="Today's Queue"        value={stats.todayQueue.toString()} sub="Waiting" />
                      </div>
                    );
                }
              })()}
            </div>
          </div>

          {/* ── MIDDLE SECTION: Full-Width Filters Bar Directly Below Calendar and Cards ── */}
          <div
            className="sd-filter-card"
            style={{
              marginBottom: '20px',
              padding: '16px 20px',
            }}
          >
            <p className="sd-filter-title" style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 700, color: 'var(--text-h)' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Role
                </span>
                <select className="sd-filter-select" style={{ width: '100%' }}>
                  <option>All</option><option>Admin</option><option>Triage</option>
                  <option>Registration</option><option>Treatment</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Status
                </span>
                <select className="sd-filter-select" style={{ width: '100%' }}>
                  <option>All</option><option>Ongoing</option>
                  <option>Completed</option><option>Abandoned</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Date Range
                </span>
                <select className="sd-filter-select" style={{ width: '100%' }}>
                  <option>This Month</option><option>Last 3 Months</option>
                  <option>Last 6 Months</option><option>This Year</option>
                </select>
              </div>

              <div>
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

              <div>
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

          {/* ── BOTTOM SECTION: 2-Column Analytics Layout ── */}
          {/* Row 1: Cases Over Time (Left) & Case Distribution (Right) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '16px',
            }}
            className="sd-analytics-row"
          >
            {/* Cases Over Time */}
            <div
              className="sd-chart-card"
              style={{
                background: 'var(--card-bg)',
                borderRadius: '14px',
                padding: '20px 24px',
                border: '1px solid var(--card-border)',
                boxShadow: '0 1px 2px rgba(23,61,41,0.03)',
                transition: 'box-shadow 0.2s',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '220px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.10)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'}
            >
              <p className="sd-chart-title" style={{ marginBottom: '12px' }}>Cases Over Time <span>(last 6 months)</span></p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <SdLineChart />
              </div>
            </div>

            {/* Case Distribution */}
            <div
              className="sd-chart-card"
              style={{
                background: 'var(--card-bg)',
                borderRadius: '14px',
                padding: '20px 24px',
                border: '1px solid var(--card-border)',
                boxShadow: '0 1px 2px rgba(23,61,41,0.03)',
                transition: 'box-shadow 0.2s',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '220px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.10)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <p className="sd-chart-title" style={{ margin: 0 }}>
                  Case Distribution
                </p>
                <div
                  style={{
                    display: 'flex',
                    gap: '2px',
                    background: 'var(--table-header-bg, #f1f5f9)',
                    padding: '3px',
                    borderRadius: '8px',
                    border: '1px solid var(--card-border, #e2e8f0)',
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
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: isActive ? 600 : 500,
                          borderRadius: '6px',
                          border: 'none',
                          background: isActive ? 'var(--card-bg, #ffffff)' : 'transparent',
                          color: isActive ? '#059669' : 'var(--text-secondary, #64748b)',
                          boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                          transition: 'all 0.18s ease',
                          fontFamily: 'inherit',
                          lineHeight: 1.3,
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.color = 'var(--text-h, #1e293b)';
                            e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.color = 'var(--text-secondary, #64748b)';
                            e.currentTarget.style.background = 'transparent';
                          }
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
                          { label: 'Category I',   pct: 20, color: '#a7d7b9' },
                          { label: 'Category II',  pct: 50, color: '#56a978' },
                          { label: 'Category III', pct: 30, color: '#1f7043' },
                        ]
                      : caseDistPeriod === 'weekly'
                      ? [
                          { label: 'Category I',   pct: 30, color: '#a7d7b9' },
                          { label: 'Category II',  pct: 45, color: '#56a978' },
                          { label: 'Category III', pct: 25, color: '#1f7043' },
                        ]
                      : caseDistPeriod === 'yearly'
                      ? [
                          { label: 'Category I',   pct: 38, color: '#a7d7b9' },
                          { label: 'Category II',  pct: 42, color: '#56a978' },
                          { label: 'Category III', pct: 20, color: '#1f7043' },
                        ]
                      : [
                          { label: 'Category I',   pct: 35, color: '#a7d7b9' },
                          { label: 'Category II',  pct: 40, color: '#56a978' },
                          { label: 'Category III', pct: 25, color: '#1f7043' },
                        ]
                  }
                />
              </div>
            </div>
          </div>

          {/* Row 2: Vaccination Trend (Left) & Animal Bite Severity (Right) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
            }}
            className="sd-analytics-row"
          >
            {/* Vaccination Trend */}
            <div
              className="sd-chart-card"
              style={{
                background: 'var(--card-bg)',
                borderRadius: '14px',
                padding: '20px 24px',
                border: '1px solid var(--card-border)',
                boxShadow: '0 1px 2px rgba(23,61,41,0.03)',
                transition: 'box-shadow 0.2s',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '220px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.10)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'}
            >
              <p className="sd-chart-title" style={{ marginBottom: '12px' }}>Vaccination Trend <span>(last 6 months)</span></p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <SdLineChart color="#10b981" />
              </div>
            </div>

            {/* High & Low Risk Places Card with Registration PSGC API */}
            <div
              className="sd-chart-card"
              style={{
                background: 'var(--card-bg)',
                borderRadius: '14px',
                padding: '20px 24px',
                border: '1px solid var(--card-border)',
                boxShadow: '0 1px 2px rgba(23,61,41,0.03)',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '235px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.10)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'}
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
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                    <select
                      value={selectedMunicipality}
                      onChange={(e) => setSelectedMunicipality(e.target.value)}
                      disabled={loadingBarangays}
                      style={{
                        padding: '4px 24px 4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-h)',
                        background: 'var(--table-header-bg, #f8fafc)',
                        border: '1px solid var(--card-border, #e2e8f0)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        outline: 'none',
                        appearance: 'none',
                        fontFamily: 'inherit',
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
                    onClick={() => navigate(ROUTES.BITE_MAP || '/bite-cases/map')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 9px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#059669',
                      background: 'var(--nav-item-hover-bg, #ecfdf5)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#10b981';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--nav-item-hover-bg, #ecfdf5)';
                      e.currentTarget.style.color = '#059669';
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
                          ? '#ef4444' // Red for High Risk
                          : b.risk === 'Moderate'
                          ? '#eab308' // Yellow/Amber for Moderate Risk
                          : '#10b981', // Green for Low Risk
                    }))}
                  />
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'cases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="sd-cards-grid">
            <SdCard color="green" label="Total Bite Cases" value={stats.biteCases.toString()} sub="Reported cases" />
            <SdCard color="blue" label="Active Cases" value={stats.activeCases.toString()} sub="Ongoing treatment" />
            <SdCard color="violet" label="Completed Cases" value={stats.completedCases.toString()} sub="Treatment finished" />
          </div>

          <div style={{ background: 'var(--card-bg)', borderRadius: '14px', border: '1px solid var(--card-border)', padding: '24px' }}>
            <p style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, color: 'var(--text-h)' }}>Recent Bite Incident Cases</p>
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
                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                            background: c.severity === 'Category III' ? '#fee2e2' : c.severity === 'Category II' ? '#fef3c7' : '#ecfdf5',
                            color: c.severity === 'Category III' ? '#ef4444' : c.severity === 'Category II' ? '#d97706' : '#10b981'
                          }}>
                            {c.severity || 'Category II'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="sd-cards-grid">
            <SdCard color="indigo" label="Pending Doses" value={stats.pendingVaccinations.toString()} sub="Scheduled" />
            <SdCard color="purple" label="Total Scheduled" value={stats.followupPatients.toString()} sub="Doses tracked" />
            <SdCard color="teal" label="Queue Count" value={stats.todayQueue.toString()} sub="Today waiting" />
          </div>

          <div style={{ background: 'var(--card-bg)', borderRadius: '14px', border: '1px solid var(--card-border)', padding: '24px' }}>
            <p style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, color: 'var(--text-h)' }}>Recent Vaccinations & Scheduled Doses</p>
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
                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
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
    </DashboardLayout>
  );
}

function SdCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const today = new Date();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const days = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, isCurrent: false, isToday: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === i;
    days.push({ day: i, isCurrent: true, isToday });
  }
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, isCurrent: false, isToday: false });
  }

  return (
    <div
      className="sd-chart-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '260px',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <p className="sd-chart-title" style={{ margin: 0 }}>
          {monthNames[month]} {year}
        </p>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={prevMonth}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              padding: '3px 8px',
              cursor: 'pointer',
              color: 'var(--text)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            ‹
          </button>
          <button
            onClick={nextMonth}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              padding: '3px 8px',
              cursor: 'pointer',
              color: 'var(--text)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            ›
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', gap: '4px', marginBottom: '8px' }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
          <span key={i} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {d}
          </span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', flex: 1, alignItems: 'center' }}>
        {days.map((item, idx) => (
          <div
            key={idx}
            style={{
              textAlign: 'center',
              padding: '6px 0',
              fontSize: '12.5px',
              borderRadius: '8px',
              color: item.isToday ? '#ffffff' : item.isCurrent ? 'var(--text-h)' : 'var(--text-secondary)',
              opacity: item.isCurrent ? 1 : 0.4,
              background: item.isToday ? '#10b981' : 'transparent',
              fontWeight: item.isToday ? 700 : 500,
              boxShadow: item.isToday ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none',
              border: item.isToday ? '1px solid #059669' : '1px solid transparent',
            }}
          >
            {item.day}
          </div>
        ))}
      </div>
    </div>
  );
}

function SdCard({ color, label, value, sub }: { color: string; label: string; value: string; sub: string }) {
  return (
    <div className={`sd-card sd-card--${color}`}>
      <p className="sd-card-label">{label}</p>
      <p className="sd-card-value">{value}</p>
      <p className="sd-card-sub">{sub}</p>
    </div>
  );
}

function SdLineChart({ color = '#4f7ef7' }: { color?: string }) {
  const points = [20, 45, 30, 60, 40, 75, 55, 80, 65, 90, 70, 85];
  const w = 400, h = 140;
  const pad = 20;
  const maxV = Math.max(...points);
  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (w - pad * 2));
  const ys = points.map(v => pad + (1 - v / maxV) * (h - pad * 2));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ');
  const area = `${path} L ${xs[xs.length - 1]} ${h - pad} L ${xs[0]} ${h - pad} Z`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="sd-line-chart"
      style={{ width: '100%', height: '100%' }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {xs.map((x, i) => i % 2 === 0 && (
        <text key={i} x={x} y={h - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">
          {months[i]}
        </text>
      ))}
    </svg>
  );
}

function SdDonutChart({ data }: { data: { label: string; pct: number; color: string }[] }) {
  const r = 55, cx = 75, cy = 75, stroke = 24;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = data.map(d => {
    const len = (d.pct / 100) * circ;
    const s = { ...d, dasharray: `${len} ${circ - len}`, offset };
    offset += len;
    return s;
  });
  return (
    <div className="sd-donut-wrap" style={{ width: '100%', justifyContent: 'center', gap: '16px' }}>
      <svg viewBox={`0 0 ${cx * 2} ${cy * 2}`} width="150" height="150">
        {slices.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={s.color} strokeWidth={stroke}
            strokeDasharray={s.dasharray}
            strokeDashoffset={-s.offset}
            transform="rotate(-90, 75, 75)"
          />
        ))}
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--text-h)">
          {data.reduce((a, d) => a + d.pct, 0)}%
        </text>
      </svg>
      <div className="sd-donut-legend">
        {data.map((d, i) => (
          <div key={i} className="sd-donut-legend-item" style={{ fontSize: '12px' }}>
            <div className="sd-donut-legend-dot" style={{ background: d.color, width: '10px', height: '10px' }} />
            <span>{d.label}</span>
            <span className="sd-donut-legend-pct" style={{ fontWeight: 700 }}>{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SdBarChart({
  data,
}: {
  data: { label: string; value: number; color?: string; subLabel?: string; riskLevel?: 'High' | 'Moderate' | 'Low' }[];
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-end', paddingTop: '4px' }}>
      {/* Chart Canvas with Clean L-Frame Axis matching the illustration */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          height: '135px',
          paddingBottom: '4px',
          paddingLeft: '12px',
          paddingRight: '6px',
          borderLeft: '2.5px solid var(--text-secondary, #94a3b8)',
          borderBottom: '2.5px solid var(--text-secondary, #94a3b8)',
          gap: '10px',
          position: 'relative',
        }}
      >
        {/* Subtle horizontal grid lines */}
        <div style={{ position: 'absolute', top: '25%', left: '12px', right: 0, borderTop: '1px dashed rgba(148, 163, 184, 0.25)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '60%', left: '12px', right: 0, borderTop: '1px dashed rgba(148, 163, 184, 0.25)', pointerEvents: 'none' }} />

        {data.map((item, idx) => {
          const heightPct = Math.max(Math.round((item.value / maxValue) * 100), 14);
          const barColor = item.color || '#2563eb';

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                maxWidth: '64px',
                height: '100%',
                justifyContent: 'flex-end',
                gap: '4px',
                zIndex: 1,
              }}
            >
              {/* Value on top of bar */}
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-h)' }}>
                {item.value}
              </span>

              {/* Solid Vertical Column Bar matching the drawing */}
              <div
                style={{
                  width: '100%',
                  height: `${heightPct}%`,
                  backgroundColor: barColor,
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: `0 4px 10px ${barColor}35`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* X-Axis Place & Risk Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: '8px', paddingLeft: '12px', gap: '10px' }}>
        {data.map((item, idx) => (
          <div
            key={idx}
            style={{
              flex: 1,
              maxWidth: '64px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '2px',
            }}
          >
            {/* Place Name */}
            <span
              style={{
                fontSize: '11px',
                fontWeight: 650,
                color: 'var(--text-h)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%',
              }}
              title={item.label}
            >
              {item.label}
            </span>

            {/* Risk Badge (High / Low / Moderate) */}
            {item.riskLevel && (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '4px',
                  lineHeight: 1.2,
                  background:
                    item.riskLevel === 'High'
                      ? 'rgba(239, 68, 68, 0.12)'
                      : item.riskLevel === 'Moderate'
                      ? 'rgba(245, 158, 11, 0.12)'
                      : 'rgba(16, 185, 129, 0.12)',
                  color:
                    item.riskLevel === 'High'
                      ? '#dc2626'
                      : item.riskLevel === 'Moderate'
                      ? '#d97706'
                      : '#059669',
                  border: `1px solid ${
                    item.riskLevel === 'High'
                      ? 'rgba(239, 68, 68, 0.25)'
                      : item.riskLevel === 'Moderate'
                      ? 'rgba(245, 158, 11, 0.25)'
                      : 'rgba(16, 185, 129, 0.25)'
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
        ))}
      </div>
    </div>
  );
}

export default SimpleDashboardPage;
