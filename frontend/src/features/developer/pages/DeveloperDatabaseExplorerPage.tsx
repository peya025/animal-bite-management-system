import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';
import { Icon } from '../../../shared/components/ui/Icon';
import '../styles/DeveloperDatabaseExplorer.css';

interface TableSummary {
  table_name: string;
  row_count: number;
  data_size: string;
  index_size: string;
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

  // Fetch all tables
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    fetch(`${API_BASE}/developer/database/tables`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.tables) {
          setTables(data.tables);
          setDatabaseName(data.database_name || 'animalbitecenter');
          if (data.tables.length > 0) {
            setSelectedTable(data.tables[0].table_name);
          }
        }
      })
      .catch(err => console.error('Failed to fetch tables:', err))
      .finally(() => setLoadingTables(false));
  }, []);

  // Fetch table column details when selectedTable changes
  useEffect(() => {
    if (!selectedTable) return;
    setLoadingDetails(true);
    const token = localStorage.getItem('authToken');

    fetch(`${API_BASE}/developer/database/tables/${selectedTable}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data) {
          setColumns(data.columns || []);
          setTotalRecords(data.total_records || 0);
        }
      })
      .catch(err => console.error('Failed to fetch table details:', err))
      .finally(() => setLoadingDetails(false));
  }, [selectedTable]);

  const filteredTables = tables.filter(t =>
    t.table_name.toLowerCase().includes(tableSearch.toLowerCase())
  );

  const filteredColumns = columns.filter(c =>
    c.column_name.toLowerCase().includes(columnSearch.toLowerCase()) ||
    c.column_type.toLowerCase().includes(columnSearch.toLowerCase())
  );

  return (
    <div className="db-explorer-container">
      {/* Minimalist Dashboard Header */}
      <div className="sd-dash-header">
        <div>
          <h1>Database Explorer</h1>
          <p>MySQL 8.0 / InnoDB · <code className="db-explorer-dbname">{databaseName}</code></p>
        </div>
        <button 
          type="button"
          className="db-explorer-back-btn"
          onClick={() => navigate(ROUTES.DASHBOARD)} 
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Main Split Panel */}
      <div className="db-explorer-split">
        {/* Left Sidebar: Table Selector */}
        <div className="db-explorer-sidebar">
          <div className="db-explorer-sidebar-header">
            <span>TABLES ({tables.length})</span>
            <span style={{ fontSize: '0.75rem', color: '#17653a', background: '#e8f5ed', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', fontWeight: 500 }}>InnoDB</span>
          </div>

          <div className="db-explorer-search-box">
            <input
              type="text"
              className="db-explorer-input"
              placeholder="Filter tables..."
              value={tableSearch}
              onChange={e => setTableSearch(e.target.value)}
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
                    placeholder="Filter columns..."
                    value={columnSearch}
                    onChange={e => setColumnSearch(e.target.value)}
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
    </div>
  );
}
