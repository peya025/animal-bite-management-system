import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';
import { Icon } from '../../../shared/components/ui/Icon';
import '../styles/DeveloperDatabaseExplorer.css';

interface TableSummary {
  table_name: string;
  row_count: number;
  column_count: number;
  primary_key: string;
  engine: string;
}

interface ColumnDetail {
  column_name: string;
  column_type: string;
  is_nullable: string;
  column_key: string;
  column_default: string | null;
  extra: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export default function DeveloperDatabaseExplorerPage() {
  const navigate = useNavigate();
  const [databaseName, setDatabaseName] = useState('animalbitecenter');
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [tableSearch, setTableSearch] = useState('');
  const [selectedTable, setSelectedTable] = useState<string>('');

  const [columns, setColumns] = useState<ColumnDetail[]>([]);
  const [columnSearch, setColumnSearch] = useState('');
  const [totalRecords, setTotalRecords] = useState(0);

  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Active View Tab: 'overview' | 'structure'
  const [activeTab, setActiveTab] = useState<'overview' | 'structure'>('overview');

  // Fetch all tables summary
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    fetch(`${API_BASE}/developer/database/tables`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          setAuthError(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.tables) {
          setTables(data.tables);
          setDatabaseName(data.database_name || 'animalbitecenter');
          if (data.tables.length > 0) {
            setSelectedTable(data.tables[0].table_name);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to fetch tables:', err);
      })
      .finally(() => setLoadingTables(false));
  }, []);

  // Fetch table column attributes when selectedTable changes
  useEffect(() => {
    if (!selectedTable) return;
    setLoadingDetails(true);
    const token = localStorage.getItem('authToken');

    fetch(`${API_BASE}/developer/database/tables/${selectedTable}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setColumns(data.columns || []);
          setTotalRecords(data.total_records || 0);
        }
      })
      .catch((err) => console.error('Failed to fetch table details:', err))
      .finally(() => setLoadingDetails(false));
  }, [selectedTable]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const filteredTables = tables.filter(
    (t) =>
      t.table_name.toLowerCase().includes(tableSearch.toLowerCase()) ||
      t.primary_key.toLowerCase().includes(tableSearch.toLowerCase())
  );

  const filteredColumns = columns.filter(
    (c) =>
      c.column_name.toLowerCase().includes(columnSearch.toLowerCase()) ||
      c.column_type.toLowerCase().includes(columnSearch.toLowerCase())
  );

  const totalSystemRows = tables.reduce((acc, t) => acc + (t.row_count || 0), 0);
  const totalColumnsCount = tables.reduce((acc, t) => acc + (t.column_count || 0), 0);

  return (
    <div className="db-explorer-container">
      {/* Toast Alert for Copying Attribute */}
      {copiedText && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: '#10b981',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          Copied to clipboard: <code>{copiedText}</code>
        </div>
      )}

      {/* Header */}
      <div className="sd-dash-header">
        <div>
          <h1>MariaDB / XAMPP Database Explorer</h1>
          <p>
            Database Engine: <strong>MariaDB / InnoDB</strong> · Target DB: <code className="db-explorer-dbname">{databaseName}</code>
          </p>
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13, color: '#9ca3af' }}>
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Dashboard
            </button>
            <span>›</span>
            <span style={{ color: '#6b7280' }}>Developer Database Inspector</span>
          </div>
        </div>
        <button type="button" className="db-explorer-back-btn" onClick={() => navigate(ROUTES.DASHBOARD)}>
          ← Back to Dashboard
        </button>
      </div>

      {authError && (
        <div
          style={{
            background: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fca5a5',
            borderRadius: '0.5rem',
            padding: '0.9rem 1.1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
            <strong>Session Expired / Unauthorized (401):</strong> Re-login required with developer credentials.
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('authToken');
              window.location.href = '/login';
            }}
            style={{
              background: '#991b1b',
              color: '#ffffff',
              border: 'none',
              padding: '0.4rem 0.85rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem',
            }}
          >
            Re-login Now
          </button>
        </div>
      )}

      {/* Database KPI Summary Cards */}
      <div className="db-kpi-grid">
        <div className="db-kpi-card">
          <div className="db-kpi-header">
            <span className="db-kpi-label">Total Tables</span>
            <Icon name="databaseExplorer" size={16} color="#17653a" />
          </div>
          <div className="db-kpi-value">{tables.length}</div>
          <div className="db-kpi-sub">MariaDB Relational Tables</div>
        </div>

        <div className="db-kpi-card">
          <div className="db-kpi-header">
            <span className="db-kpi-label">Total System Records</span>
            <Icon name="reports" size={16} color="#17653a" />
          </div>
          <div className="db-kpi-value">{totalColumnsCount || '—'}</div>
          <div className="db-kpi-sub">Defined Schema Columns</div>
        </div>

        <div className="db-kpi-card">
          <div className="db-kpi-header">
            <span className="db-kpi-label">Database Engine</span>
            <Icon name="developerSettings" size={16} color="#17653a" />
          </div>
          <div className="db-kpi-value">{totalSystemRows.toLocaleString()}</div>
          <div className="db-kpi-sub">System Records</div>
        </div>

        <div className="db-kpi-card">
          <div className="db-kpi-header">
            <span className="db-kpi-label">Data Privacy Status</span>
            <Icon name="check" size={16} color="#17653a" />
          </div>
          <div className="db-kpi-value" style={{ color: '#17653a' }}>Active</div>
          <div className="db-kpi-sub">Raw Patient Data Protected</div>
        </div>
      </div>

      {/* TAB 1: DATABASE TABLE OVERVIEW */}
      {activeTab === 'overview' && (
      <div className="db-explorer-split">
        {/* Left Sidebar: Table Selector */}
        <div className="db-explorer-sidebar">
          <div className="db-explorer-sidebar-header">
            <span>TABLES ({tables.length})</span>
            <span style={{ fontSize: '0.75rem', color: '#17653a', background: '#e8f5ed', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', fontWeight: 500 }}>InnoDB</span>
          </div>

            <input
              type="text"
              className="db-explorer-input"
              style={{ width: 260 }}
              placeholder="Search table name or key..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
          </div>

          <div className="db-explorer-table-wrapper">
            <table className="db-explorer-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Table Name</th>
                  <th>Primary Key</th>
                  <th>Attribute Count</th>
                  <th>Row Count</th>
                  <th>Engine</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingTables ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>
                      Loading database schema summary...
                    </td>
                  </tr>
                ) : (
                  filteredTables.map((t, idx) => (
                    <tr key={t.table_name} style={{ backgroundColor: selectedTable === t.table_name ? '#f0fdf4' : undefined }}>
                      <td style={{ color: '#9ca3af', fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <button
                          onClick={() => {
                            setSelectedTable(t.table_name);
                            setActiveTab('structure');
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            fontFamily: 'monospace',
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: '#059669',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Icon name="table" size={14} color="#059669" /> {t.table_name}
                        </button>
                      </td>
                      <td>
                        <code style={{ fontSize: 12, backgroundColor: '#f3f4f6', color: '#1f2937', padding: '2px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="key" size={12} color="#059669" /> {t.primary_key || 'id'}
                        </code>
                      </td>
                      <td style={{ fontWeight: 600, color: '#374151' }}>
                        {t.column_count || '—'} columns
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 700,
                            backgroundColor: t.row_count > 0 ? '#dcfce7' : '#f3f4f6',
                            color: t.row_count > 0 ? '#15803d' : '#6b7280',
                          }}
                        >
                          {t.row_count.toLocaleString()} rows
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{t.engine || 'InnoDB'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={() => {
                              setSelectedTable(t.table_name);
                              setActiveTab('structure');
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 600,
                              border: '1px solid #bbf7d0',
                              backgroundColor: '#f0fdf4',
                              color: '#166534',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            Inspect Attributes <Icon name="settings" size={12} color="#166534" />
                          </button>
                          <button
                            onClick={() => copyToClipboard(t.table_name)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              border: '1px solid #e5e7eb',
                              backgroundColor: '#ffffff',
                              color: '#374151',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Icon name="copy" size={12} color="#374151" /> Copy Name
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TABLE ATTRIBUTES & DATATYPES INSPECTOR */}
      {activeTab === 'structure' && (
        <div className="db-explorer-split">
          {/* Left Sidebar Table List */}
          <div className="db-explorer-sidebar">
            <div className="db-explorer-sidebar-header">
              <span>TABLES ({tables.length})</span>
              <span style={{ fontSize: '0.75rem', color: '#17653a', background: '#e8f5ed', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', fontWeight: 500 }}>
                MariaDB
              </span>
            </div>

            <div className="db-explorer-search-box">
              <input
                type="text"
                className="db-explorer-input"
                placeholder="Filter table list..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
              />
            </div>

          <div className="db-explorer-table-list">
            {loadingTables ? (
              <p style={{ padding: '1rem', fontSize: '0.8125rem', color: '#77877d', fontWeight: 400 }}>Loading tables...</p>
            ) : (
              filteredTables.map(t => {
                const isSelected = selectedTable === t.table_name;
                return (
                  <button
                    key={t.table_name}
                    type="button"
                    className={`db-explorer-table-item ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedTable(t.table_name);
                    }}
                  >
                    <span className="db-explorer-table-name" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Icon name="inventory" size={14} color={isSelected ? '#17653a' : '#77877d'} />
                      {t.table_name}
                    </span>
                    <span className="db-explorer-badge-count">
                      {t.row_count}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Table Structure Inspector */}
        <div className="db-explorer-main">
          {selectedTable ? (
            <>
              {/* Privacy Notice Banner */}
              <div style={{ background: '#f5f8f6', border: '1px solid #e0eae3', borderRadius: '0.5rem', padding: '0.65rem 0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#173d29' }}>
                <Icon name="info" size={18} color="#17653a" />
                <div style={{ fontSize: '0.8125rem', fontWeight: 400, color: '#475569' }}>
                  <span style={{ fontWeight: 500, color: '#173d29' }}>Data Privacy Protection Active: </span>
                  Raw patient and clinical record contents are hidden from UI preview for privacy compliance. Column structures and datatypes are inspectable below.
                </div>
              </div>

              {/* Table Toolbar */}
              <div className="db-explorer-toolbar">
                <div>
                  <h2 className="db-explorer-table-title">
                    Table Schema: <span style={{ color: '#17653a', fontWeight: 500 }}>{selectedTable}</span>
                  </h2>
                  <span className="db-explorer-table-meta">
                    Total System Records: {totalRecords} | Table Columns: {columns.length}
                  </span>
                </div>

                  <div className="db-explorer-controls">
                    <input
                      type="text"
                      className="db-explorer-input"
                      style={{ width: '220px' }}
                      placeholder="Search attribute name..."
                      value={columnSearch}
                      onChange={(e) => setColumnSearch(e.target.value)}
                    />
                  </div>
                </div>

              {/* Table Column Structure View */}
              {loadingDetails ? (
                <p style={{ padding: '2rem', textAlign: 'center', color: '#17653a', fontWeight: 400 }}>Loading column structure...</p>
              ) : (
                <div className="db-explorer-table-wrapper">
                  <table className="db-explorer-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Column Name</th>
                        <th>Data Type</th>
                        <th>Null</th>
                        <th>Index Key</th>
                        <th>Default</th>
                        <th>Extra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredColumns.map((col, idx) => (
                        <tr key={col.column_name}>
                          <td style={{ color: '#64748b', fontWeight: 400 }}>{idx + 1}</td>
                          <td style={{ fontWeight: 400, fontFamily: 'monospace', color: '#1e293b' }}>
                            {col.column_key === 'PRI' && <Icon name="key" size={13} color="#17653a" style={{ marginRight: '0.25rem' }} />}
                            {col.column_name}
                          </td>
                          <td style={{ color: '#17653a', fontFamily: 'monospace', fontWeight: 400 }}>{col.column_type}</td>
                          <td>
                            <span style={{ background: col.is_nullable === 'YES' ? '#e8f5ed' : '#fee2e2', color: col.is_nullable === 'YES' ? '#17653a' : '#991b1b', padding: '0.12rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 400 }}>
                              {col.is_nullable}
                            </span>
                          </td>
                          <td style={{ fontWeight: 400, color: '#0d9488' }}>{col.column_key || '-'}</td>
                          <td style={{ color: '#475569', fontFamily: 'monospace', fontWeight: 400 }}>{col.column_default ?? 'NULL'}</td>
                          <td style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 400 }}>{col.extra || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: '#77877d', fontWeight: 400 }}>Select a table from the left list to view structure.</p>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
