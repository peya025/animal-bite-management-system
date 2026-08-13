import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../shared/services/api';
import { ROUTES } from '../../../shared/config/routes';
import DashboardLayout from '../../../components/Layout/DashboardLayout';

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

  // Fetch real statistics from database
  useEffect(() => {
    if (!setupCheckDone || isLoading) return;

    const fetchStats = async () => {
      try {
        const [patientsRes, casesRes, vaccineRes, queueRes] = await Promise.all([
          api.get('/patients?per_page=1'),
          api.get('/cases/statistics'),
          api.get('/vaccinations/statistics'),
          api.get('/queue/statistics'),
        ]);

        const [recentCasesRes, recentVaccsRes] = await Promise.all([
          api.get('/cases?per_page=5'),
          api.get('/vaccinations?per_page=5')
        ]);

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

      {/* ── Stat Cards - Role Specific ── */}
      <div className="sd-cards-grid">
        {(() => {
          switch (user?.role) {
            case 'admin':
              return (
                <>
                  <SdCard color="purple"  label="Total Patients"      value={stats.totalPatients.toString()} sub="Registered" />
                  <SdCard color="blue"    label="Active Cases"         value={stats.activeCases.toString()} sub="Ongoing" />
                  <SdCard color="indigo"  label="Pending Vaccinations" value={stats.pendingVaccinations.toString()} sub="Scheduled" />
                  <SdCard color="teal"    label="Today's Queue"        value={stats.todayQueue.toString()} sub="Waiting" />
                  <SdCard color="violet"  label="Completed Cases"      value={stats.completedCases.toString()} sub="This month" />
                  <SdCard color="cyan"    label="Follow-up Patients"   value={stats.followupPatients.toString()} sub="This week" />
                  <SdCard color="green"   label="Bite Cases"           value={stats.biteCases.toString()} sub="Total" />
                  <SdCard color="emerald" label="New Today"            value={stats.newToday.toString()} sub="Registered" />
                </>
              );
            case 'registration':
              return (
                <>
                  <SdCard color="purple"  label="Total Patients" value={stats.totalPatients.toString()} sub="Registered" />
                  <SdCard color="teal"    label="Today's Queue"  value={stats.todayQueue.toString()} sub="Waiting" />
                  <SdCard color="emerald" label="New Today"       value={stats.newToday.toString()} sub="Registered" />
                </>
              );
            case 'triage':
              return (
                <>
                  <SdCard color="blue"    label="Active Cases"         value={stats.activeCases.toString()} sub="Ongoing" />
                  <SdCard color="teal"    label="Today's Queue"        value={stats.todayQueue.toString()} sub="Waiting" />
                  <SdCard color="indigo"  label="Pending Vaccinations" value={stats.pendingVaccinations.toString()} sub="Scheduled" />
                  <SdCard color="purple"  label="Total Patients"       value={stats.totalPatients.toString()} sub="Registered" />
                  <SdCard color="green"   label="Bite Cases"           value={stats.biteCases.toString()} sub="Total" />
                  <SdCard color="violet"  label="Completed Cases"      value={stats.completedCases.toString()} sub="This month" />
                </>
              );
            case 'treatment':
              return (
                <>
                  <SdCard color="indigo"  label="Pending Vaccinations" value={stats.pendingVaccinations.toString()} sub="Scheduled" />
                  <SdCard color="teal"    label="Today's Queue"        value={stats.todayQueue.toString()} sub="Waiting" />
                  <SdCard color="blue"    label="Active Cases"         value={stats.activeCases.toString()} sub="Ongoing" />
                  <SdCard color="violet"  label="Completed Cases"      value={stats.completedCases.toString()} sub="This month" />
                </>
              );
            default:
              return (
                <>
                  <SdCard color="purple"  label="Total Patients"      value={stats.totalPatients.toString()} sub="Registered" />
                  <SdCard color="blue"    label="Active Cases"         value={stats.activeCases.toString()} sub="Ongoing" />
                  <SdCard color="indigo"  label="Pending Vaccinations" value={stats.pendingVaccinations.toString()} sub="Scheduled" />
                  <SdCard color="teal"    label="Today's Queue"        value={stats.todayQueue.toString()} sub="Waiting" />
                </>
              );
          }
        })()}
      </div>

      {/* ── Charts + Filters in one unified 3-column row ── */}
      {activeTab === 'overview' && (
        <>
          <div className="sd-charts-row" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
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
              <p className="sd-chart-title" style={{ marginBottom: '12px' }}>Case Distribution</p>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SdDonutChart
                  data={[
                    { label: 'Category I',   pct: 35, color: '#a7d7b9' },
                    { label: 'Category II',  pct: 40, color: '#56a978' },
                    { label: 'Category III', pct: 25, color: '#1f7043' },
                  ]}
                />
              </div>
            </div>

            {/* Filters */}
            <div
              className="sd-filter-card"
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
              <p className="sd-filter-title" style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 700, color: 'var(--text-h)' }}>Filters</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</span>
                  <select className="sd-filter-select" style={{ padding: '6px 10px', fontSize: '12px', width: '100%' }}>
                    <option>All</option><option>Admin</option><option>Triage</option>
                    <option>Registration</option><option>Treatment</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
                  <select className="sd-filter-select" style={{ padding: '6px 10px', fontSize: '12px', width: '100%' }}>
                    <option>All</option><option>Ongoing</option>
                    <option>Completed</option><option>Abandoned</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Range</span>
                  <select className="sd-filter-select" style={{ padding: '6px 10px', fontSize: '12px', width: '100%' }}>
                    <option>This Month</option><option>Last 3 Months</option>
                    <option>Last 6 Months</option><option>This Year</option>
                  </select>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                  <button className="sd-filter-link" onClick={() => { navigate('/patients'); }} style={{ padding: '6px 12px', fontSize: '12px', flex: 1 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                    </svg>
                    Patients
                  </button>
                  <button className="sd-filter-link" onClick={() => { navigate('/bite-cases'); }} style={{ padding: '6px 12px', fontSize: '12px', flex: 1 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    Cases
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="sd-charts-bottom" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
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
              <p className="sd-chart-title" style={{ marginBottom: '12px' }}>Animal Bite Severity</p>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SdDonutChart
                  data={[
                    { label: 'Cat. I (Minor)',     pct: 30, color: '#a7d7b9' },
                    { label: 'Cat. II (Moderate)', pct: 45, color: '#56a978' },
                    { label: 'Cat. III (Severe)',  pct: 25, color: '#1f7043' },
                  ]}
                />
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

export default SimpleDashboardPage;
