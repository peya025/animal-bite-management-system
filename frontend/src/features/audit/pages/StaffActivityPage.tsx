// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { ROUTES } from '../../../shared/config/routes';
import { Icon, type IconName } from '../../../shared/components/ui/Icon';
import '../../developer/styles/DeveloperDatabaseExplorer.css';

interface AuditLog {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  action: string;
  description: string;
  ip_address: string;
  created_at: string;
  metadata?: any;
}

interface Summary {
  today_actions: number;
  week_actions: number;
  today_logins: number;
  most_active_user: any;
  suspicious_after_hours: number;
}

const actionBadges: Record<string, { bg: string; color: string; border: string; icon: IconName }> = {
  login: { bg: '#e8f5ed', color: '#17653a', border: '#d7ebdf', icon: 'login' },
  logout: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', icon: 'logout' },
  created: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', icon: 'plus' },
  updated: { bg: '#f0f9ff', color: '#0284c7', border: '#e0f2fe', icon: 'edit' },
  deleted: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', icon: 'trash' },
  viewed: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', icon: 'info' },
};

export default function StaffActivityPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);

  // Filters
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
    loadUsers();
  }, [selectedUser, selectedAction, dateFrom, dateTo, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedUser) params.append('user_id', selectedUser);
      if (selectedAction) params.append('action', selectedAction);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (search) params.append('search', search);

      const [logsRes, summaryRes] = await Promise.all([
        api.get(`/audit-logs?${params}`),
        api.get('/audit-logs/summary'),
      ]);

      setLogs(logsRes.data.data || []);
      setSummary(summaryRes.data || null);
    } catch (error) {
      console.error('Failed to load audit logs', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to load users', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isAfterHours = (dateString: string) => {
    const date = new Date(dateString);
    const hour = date.getHours();
    return hour < 8 || hour >= 17;
  };

  return (
    <div style={{ width: '100%', margin: 0, padding: 0 }}>
      {/* Minimalist Dashboard Header */}
      <div className="sd-dash-header">
        <div>
          <h1>Staff Activity Monitor</h1>
          <p>Track staff actions, logins, and system audit logs</p>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13, color: '#9ca3af' }}>
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
            >Dashboard</button>
            <span>›</span>
            <button
              onClick={() => navigate(ROUTES.CLINIC_SETUP.ROOT)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#6b7280', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
            >Clinic Setup</button>
            <span>›</span>
            <span style={{ color: '#6b7280' }}>Staff Activity</span>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="db-kpi-grid">
        <div className="db-kpi-card">
          <div className="db-kpi-header">
            <span className="db-kpi-label">Actions Today</span>
            <Icon name="activity" size={16} color="#17653a" />
          </div>
          <div className="db-kpi-value">{summary?.today_actions ?? 0}</div>
          <div className="db-kpi-sub">System Activities Logged</div>
        </div>

        <div className="db-kpi-card">
          <div className="db-kpi-header">
            <span className="db-kpi-label">Logins Today</span>
            <Icon name="login" size={16} color="#0284c7" />
          </div>
          <div className="db-kpi-value" style={{ color: '#0284c7' }}>{summary?.today_logins ?? 0}</div>
          <div className="db-kpi-sub">Active Staff Sessions</div>
        </div>

        <div className="db-kpi-card">
          <div className="db-kpi-header">
            <span className="db-kpi-label">After Hours Actions</span>
            <Icon name="warning" size={16} color={summary?.suspicious_after_hours ? '#d97706' : '#64748b'} />
          </div>
          <div className="db-kpi-value" style={{ color: summary?.suspicious_after_hours ? '#d97706' : '#173d29' }}>
            {summary?.suspicious_after_hours ?? 0}
          </div>
          <div className="db-kpi-sub">Outside 8 AM – 5 PM Window</div>
        </div>

        <div className="db-kpi-card">
          <div className="db-kpi-header">
            <span className="db-kpi-label">Most Active Staff</span>
            <Icon name="users" size={16} color="#17653a" />
          </div>
          <div className="db-kpi-value" style={{ fontSize: '1.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {summary?.most_active_user?.user?.name || '—'}
          </div>
          <div className="db-kpi-sub">Top Contributor</div>
        </div>
      </div>

      {/* After Hours Alert Banner */}
      {summary && summary.suspicious_after_hours > 0 && (
        <div
          style={{
            background: '#fffbe6',
            border: '1px solid #ffe58f',
            borderRadius: '14px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: '#873800',
            fontSize: '0.8125rem',
            fontWeight: 400,
          }}
        >
          <Icon name="warning" size={18} color="#d48806" />
          <span>
            <strong>{summary.suspicious_after_hours} actions detected outside clinic hours:</strong> System events occurred before 8:00 AM or after 5:00 PM.
          </span>
        </div>
      )}

      {/* Filters Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e0eae3',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', alignItems: 'center' }}>
          {/* Staff Member Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#77877d', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              Staff Member
            </label>
            <select
              className="db-explorer-input"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="">All Staff Members</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
          </div>

          {/* Action Type Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#77877d', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              Action Type
            </label>
            <select
              className="db-explorer-input"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="viewed">Viewed</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#77877d', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              From Date
            </label>
            <input
              type="date"
              className="db-explorer-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          {/* Date To */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#77877d', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              To Date
            </label>
            <input
              type="date"
              className="db-explorer-input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {/* Search IP or Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#77877d', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              Search IP / Terms
            </label>
            <input
              type="text"
              className="db-explorer-input"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Activity Table Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e0eae3',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f0f7f2' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#173d29', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="activity" size={18} color="#17653a" />
            Audit Activity Logs ({logs.length})
          </div>
          <span style={{ fontSize: '0.75rem', color: '#77877d', fontWeight: 400 }}>
            Showing latest staff audit events
          </span>
        </div>

        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#17653a', fontWeight: 400, margin: 0 }}>
            Loading staff activity logs...
          </p>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#77877d' }}>
            <Icon name="security" size={32} color="#cbd5e1" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#475569' }}>No activity logs recorded</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 400, color: '#94a3b8' }}>Staff actions will appear here automatically</div>
          </div>
        ) : (
          <div className="db-explorer-table-wrapper">
            <table className="db-explorer-table">
              <thead>
                <tr>
                  <th>Time & Date</th>
                  <th>Staff Member</th>
                  <th>Action</th>
                  <th>Description</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const badge = actionBadges[log.action] || {
                    bg: '#f8fafc',
                    color: '#475569',
                    border: '#e2e8f0',
                    icon: 'info',
                  };
                  const afterHours = isAfterHours(log.created_at);

                  return (
                    <tr key={log.id}>
                      {/* Time */}
                      <td>
                        <div style={{ fontWeight: 400, color: '#1e293b' }}>{formatDate(log.created_at)}</div>
                        {afterHours && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              background: '#fffbe6',
                              color: '#d48806',
                              border: '1px solid #ffe58f',
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '0.25rem',
                              marginTop: '0.2rem',
                              fontWeight: 400,
                            }}
                          >
                            <Icon name="warning" size={10} color="#d48806" />
                            After hours
                          </span>
                        )}
                      </td>

                      {/* Staff Member */}
                      <td>
                        <div style={{ fontWeight: 500, color: '#173d29' }}>{log.user?.name || 'Unknown Staff'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>{log.user?.role || '—'}</div>
                      </td>

                      {/* Action */}
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            fontSize: '0.75rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontWeight: 500,
                            textTransform: 'capitalize',
                          }}
                        >
                          <Icon name={badge.icon} size={12} color={badge.color} />
                          {log.action}
                        </span>
                      </td>

                      {/* Description */}
                      <td style={{ color: '#334155', fontWeight: 400, whiteSpace: 'normal', maxWidth: '360px' }}>
                        {log.description}
                      </td>

                      {/* IP Address */}
                      <td style={{ fontFamily: 'monospace', color: '#64748b', fontWeight: 400 }}>
                        {log.ip_address}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
