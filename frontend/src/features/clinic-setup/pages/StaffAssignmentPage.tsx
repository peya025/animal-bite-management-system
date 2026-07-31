import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { staffApi } from '../../../services/staffApi';
import { ROUTES } from '../../../shared/config/routes';
import type { StaffUser, AssignedModule } from '../../../types';

const MODULE_OPTIONS: { value: AssignedModule; label: string; color: string }[] = [
  { value: 'all', label: 'All Modules', color: '#6366f1' },
  { value: 'registration', label: 'Registration', color: '#8b5cf6' },
  { value: 'triage', label: 'Triage', color: '#06b6d4' },
  { value: 'treatment', label: 'Treatment', color: '#10b981' },
  { value: 'inventory', label: 'Inventory', color: '#f59e0b' },
];

const MODULE_COLORS: Record<AssignedModule, string> = {
  all: '#6366f1',
  registration: '#8b5cf6',
  triage: '#06b6d4',
  treatment: '#10b981',
  inventory: '#f59e0b',
};

export default function StaffAssignmentPage() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const data = await staffApi.getAllStaff();
      setStaff(data);
    } catch (error: any) {
      showNotification('error', error.response?.data?.message || 'Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleModuleChange = async (userId: number, newModule: AssignedModule) => {
    try {
      setSaving(userId);
      const updatedUser = await staffApi.updateAssignedModule(userId, newModule);
      
      // Update local state
      setStaff(prev =>
        prev.map(s => (s.id === userId ? { ...s, assigned_module: updatedUser.assigned_module } : s))
      );
      
      showNotification('success', 'Module assignment updated successfully');
    } catch (error: any) {
      showNotification('error', error.response?.data?.message || 'Failed to update module assignment');
    } finally {
      setSaving(null);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const filteredStaff = staff.filter(
    s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const stats = {
    total: staff.length,
    all: staff.filter(s => s.assigned_module === 'all').length,
    registration: staff.filter(s => s.assigned_module === 'registration').length,
    triage: staff.filter(s => s.assigned_module === 'triage').length,
    treatment: staff.filter(s => s.assigned_module === 'treatment').length,
    inventory: staff.filter(s => s.assigned_module === 'inventory').length,
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading staff members...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Staff Module Assignments</h1>
          <p style={styles.subtitle}>
            Assign staff members to specific modules to control their access and responsibilities
          </p>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13, color: '#9ca3af' }}>
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
            >Dashboard</button>
            <span>›</span>
            <span style={{ color: '#6b7280' }}>Clinic Setup</span>
            <span>›</span>
            <span style={{ color: '#6b7280' }}>Staff Assignments</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <StatCard label="Total Staff" value={stats.total} color="#6366f1" />
        <StatCard label="All Modules" value={stats.all} color="#6366f1" />
        <StatCard label="Registration" value={stats.registration} color="#8b5cf6" />
        <StatCard label="Triage" value={stats.triage} color="#06b6d4" />
        <StatCard label="Treatment" value={stats.treatment} color="#10b981" />
        <StatCard label="Inventory" value={stats.inventory} color="#f59e0b" />
      </div>

      {/* Search */}
      <div style={styles.searchContainer}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6b7280"
          strokeWidth="2"
          style={styles.searchIcon}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search by name, email, or role..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} style={styles.clearButton}>
            ×
          </button>
        )}
      </div>

      {/* Staff Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Assigned Module</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={5} style={styles.emptyCell}>
                  {searchTerm ? 'No staff members match your search' : 'No staff members found'}
                </td>
              </tr>
            ) : (
              filteredStaff.map(member => (
                <tr key={member.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.nameCell}>
                      <div style={styles.avatar}>
                        {member.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <span style={styles.name}>{member.name}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.email}>{member.email}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.roleBadge}>{member.role}</span>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.moduleBadge,
                        backgroundColor: `${MODULE_COLORS[member.assigned_module]}15`,
                        color: MODULE_COLORS[member.assigned_module],
                      }}
                    >
                      {MODULE_OPTIONS.find(m => m.value === member.assigned_module)?.label ||
                        member.assigned_module}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <select
                      value={member.assigned_module}
                      onChange={e => handleModuleChange(member.id, e.target.value as AssignedModule)}
                      disabled={saving === member.id}
                      style={styles.select}
                    >
                      {MODULE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info Box */}
      <div style={styles.infoBox}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          style={{ flexShrink: 0 }}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <div>
          <strong style={{ color: '#1e3a8a' }}>Module Assignment Guide:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: '#1e40af' }}>
            <li>
              <strong>All Modules:</strong> Staff member has access to all system modules
            </li>
            <li>
              <strong>Registration:</strong> Can register patients and manage queue
            </li>
            <li>
              <strong>Triage:</strong> Can assess bite incidents and categorize severity
            </li>
            <li>
              <strong>Treatment:</strong> Can administer vaccines and record treatments
            </li>
            <li>
              <strong>Inventory:</strong> Can manage vaccine inventory and stock levels
            </li>
          </ul>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          style={{
            ...styles.notification,
            backgroundColor: notification.type === 'success' ? '#d1fae5' : '#fee2e2',
            borderLeft: `4px solid ${notification.type === 'success' ? '#10b981' : '#ef4444'}`,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={notification.type === 'success' ? '#10b981' : '#ef4444'}
            strokeWidth="2"
          >
            {notification.type === 'success' ? (
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />
            ) : (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </>
            )}
          </svg>
          <span
            style={{
              color: notification.type === 'success' ? '#065f46' : '#991b1b',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {notification.message}
          </span>
          <button onClick={() => setNotification(null)} style={styles.notificationClose}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIcon, backgroundColor: `${color}15` }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <div>
        <p style={styles.statLabel}>{label}</p>
        <p style={styles.statValue}>{value}</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    flexDirection: 'column',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #10b981',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '14px',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  statIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0 0 4px 0',
    fontWeight: 500,
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#111827',
    margin: 0,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: '24px',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '12px 40px 12px 42px',
    fontSize: '14px',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    backgroundColor: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  clearButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
  },
  tableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    marginBottom: '24px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.15s',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#374151',
  },
  emptyCell: {
    padding: '48px 16px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#9ca3af',
  },
  nameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 600,
  },
  name: {
    fontWeight: 500,
    color: '#111827',
  },
  email: {
    color: '#6b7280',
  },
  roleBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    backgroundColor: '#f3f4f6',
    color: '#374151',
    textTransform: 'capitalize',
  },
  moduleBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  select: {
    padding: '8px 32px 8px 12px',
    fontSize: '13px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.2s',
    minWidth: '160px',
  },
  infoBox: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#dbeafe',
    border: '1px solid #93c5fd',
    borderRadius: '10px',
    fontSize: '13px',
    color: '#1e40af',
  },
  notification: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 20px',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 1000,
    minWidth: '300px',
  },
  notificationClose: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    fontSize: '24px',
    lineHeight: 1,
    cursor: 'pointer',
    padding: '0 4px',
    opacity: 0.6,
  },
};
