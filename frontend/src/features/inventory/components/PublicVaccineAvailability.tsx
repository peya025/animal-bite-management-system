import { Fragment, useEffect, useState } from 'react';
import { API_BASE_URL } from '../../../shared/services/api';
import './PublicVaccineAvailability.css';

interface PublicVaccine {
  id: string | number;
  vaccine_name: string;
  category: string;
  administration_route: string | null;
  storage_temperature_notes: string | null;
  availability_status: 'In Stock' | 'Limited Stock' | 'Out of Stock' | string;
  available_vials?: number | null;
  active_batches?: number | null;
  in_stock?: boolean;
}

interface Availability {
  facility_name?: string;
  facility_address?: string;
  updated_at?: string;
  vaccines: PublicVaccine[];
}

export default function PublicVaccineAvailability({
  schedule,
  hours,
  registration,
}: {
  schedule?: string;
  hours?: string;
  registration?: string;
} = {}) {
  const [data, setData] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/public/vaccine-availability`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Inventory unavailable');
        const result: Availability = await response.json();
        if (!Array.isArray(result.vaccines)) throw new Error('Invalid inventory');
        if (!controller.signal.aborted) {
          setData(result);
          setError(false);
          setCategory(previous =>
            previous === 'All' || result.vaccines.some(v => v.category === previous)
              ? previous
              : 'All'
          );
        }
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        pending = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    const interval = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 60000);
    const onFocus = () => {
      void load();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const vaccines = data?.vaccines ?? [];
  const categories = ['All', ...new Set(vaccines.map(v => v.category))];

  const getStockStatus = (v: PublicVaccine): 'in_stock' | 'low_stock' | 'out_of_stock' => {
    const status = (v.availability_status || '').toLowerCase();
    const vials = typeof v.available_vials === 'number' ? v.available_vials : null;

    if (status.includes('out') || vials === 0) return 'out_of_stock';
    if (status.includes('limit') || status.includes('low') || (vials !== null && vials > 0 && vials <= 10)) {
      return 'low_stock';
    }
    if (status.includes('in') || (vials !== null && vials > 10) || v.in_stock) {
      return 'in_stock';
    }
    return 'out_of_stock';
  };

  const getStatusLabel = (v: PublicVaccine): string => {
    const key = getStockStatus(v);
    if (key === 'in_stock') return 'In stock';
    if (key === 'low_stock') return 'Low stock';
    return 'Out of stock';
  };

  const visible = vaccines.filter(v => {
    const matchesCategory = category === 'All' || v.category === category;
    const searchTarget = `${v.vaccine_name} ${v.category}`.toLowerCase();
    const matchesSearch = searchTarget.includes(search.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalTypes = vaccines.length;
  const inStockCount = vaccines.filter(v => getStockStatus(v) === 'in_stock').length;
  const lowStockCount = vaccines.filter(v => getStockStatus(v) === 'low_stock').length;
  const outOfStockCount = vaccines.filter(v => getStockStatus(v) === 'out_of_stock').length;

  const toggleRow = (id: string | number) => {
    const key = String(id);
    setExpandedIds(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const formattedTime = data?.updated_at && !isNaN(new Date(data.updated_at).getTime())
    ? new Date(data.updated_at).toLocaleTimeString('en-PH', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila',
      })
    : new Date().toLocaleTimeString('en-PH', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila',
      });

  return (
    <section id="vaccines" className="public-stock scroll-reveal" aria-labelledby="public-stock-title">
      <div className="public-stock-heading">
        <div className="public-stock-header-left">
          <div className="public-stock-badge-tag">
            <span className="live-status-dot" aria-hidden="true" />
            <span>Clinic Inventory</span>
          </div>
          <h2 id="public-stock-title" className="public-stock-title">Vaccine availability</h2>
          <p className="public-stock-subtitle">Current clinic stock at {data?.facility_name ?? 'Tagoloan Animal Bite Treatment Center'}</p>
        </div>

        <div className="public-stock-header-divider" aria-hidden="true" />

        <div className="public-stock-header-right">
          <div className="public-stock-chips-row" aria-label="Vaccine inventory stock summary">
            <div className="stock-summary-chip chip-total">
              <span className="chip-num">{data ? totalTypes : '—'}</span>
              <span className="chip-text">vaccine {totalTypes === 1 ? 'type' : 'types'}</span>
            </div>

            <div className="stock-summary-chip chip-in-stock">
              <span className="chip-indicator dot-in-stock" aria-hidden="true" />
              <span className="chip-num">{data ? inStockCount : '—'}</span>
              <span className="chip-text">in stock</span>
            </div>

            <div className="stock-summary-chip chip-low-stock">
              <span className="chip-indicator dot-low-stock" aria-hidden="true" />
              <span className="chip-num">{data ? lowStockCount : '—'}</span>
              <span className="chip-text">low stock</span>
            </div>

            <div className="stock-summary-chip chip-out-stock">
              <span className="chip-indicator dot-out-stock" aria-hidden="true" />
              <span className="chip-num">{data ? outOfStockCount : '—'}</span>
              <span className="chip-text">out of stock</span>
            </div>
          </div>

          <div className="public-stock-meta-row">
            <span className="public-stock-last-updated">
              Last updated: <strong>{formattedTime}</strong> (PHT)
            </span>
            <button
              type="button"
              disabled={loading}
              onClick={() => setRefresh(n => n + 1)}
              className={`public-stock-refresh-btn ${loading ? 'is-loading' : ''}`}
              aria-label="Refresh availability"
            >
              <svg
                className={`public-stock-refresh-icon ${loading ? 'is-spinning' : ''}`}
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
              </svg>
              <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="public-stock-toolbar">
        <div className="public-stock-search-wrap">
          <svg
            className="public-stock-search-icon"
            viewBox="0 0 24 24"
            width="17"
            height="17"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="public-stock-search-input"
            placeholder="Search vaccines…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search vaccines"
          />
          {search && (
            <button
              type="button"
              className="public-stock-search-clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="public-stock-select-wrap">
          <select
            className="public-stock-category-select"
            value={category}
            onChange={e => setCategory(e.target.value)}
            aria-label="Filter vaccines by category"
          >
            <option value="All">All categories</option>
            {categories
              .filter(c => c !== 'All')
              .map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
          </select>
          <svg
            className="public-stock-select-chevron"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {error && (
        <div className="public-stock-notice" role="alert">
          <svg
            className="public-stock-notice-icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            Unable to refresh availability.{' '}
            {data
              ? 'Showing the last successful update; stock may have changed.'
              : 'Please try refreshing again.'}
          </span>
          <button
            type="button"
            onClick={() => setRefresh(n => n + 1)}
            className="public-stock-retry-btn"
          >
            Retry
          </button>
        </div>
      )}

      <div className="public-stock-table-card">
        <table className="public-stock-table" aria-label="Clinic vaccine inventory availability">
          <thead>
            <tr>
              <th scope="col" className="col-vaccine">Vaccine</th>
              <th scope="col" className="col-category">Category</th>
              <th scope="col" className="col-available">Available</th>
              <th scope="col" className="col-status">Status</th>
              <th scope="col" className="col-expand"><span className="sr-only">Details</span></th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr>
                <td colSpan={5} className="public-stock-state-cell">
                  <div className="public-stock-loading-box">
                    <span className="public-stock-spinner" aria-hidden="true" />
                    <span>Loading vaccine inventory…</span>
                  </div>
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="public-stock-state-cell">
                  <div className="public-stock-empty-box">
                    <p className="empty-title">
                      {vaccines.length ? 'No matching vaccines' : 'No inventory to display yet'}
                    </p>
                    <p className="empty-sub">
                      {vaccines.length
                        ? 'Try searching with another name or selecting a different category.'
                        : 'Vaccine availability will appear when clinic inventory is recorded.'}
                    </p>
                    {vaccines.length > 0 && (search.trim() || category !== 'All') && (
                      <button
                        type="button"
                        className="public-stock-clear-filter-btn"
                        onClick={() => {
                          setSearch('');
                          setCategory('All');
                        }}
                      >
                        Reset search & category
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              visible.map(v => {
                const rowId = String(v.id);
                const isExpanded = !!expandedIds[rowId];
                const statusKey = getStockStatus(v);
                const statusLabel = getStatusLabel(v);
                const hasVials = typeof v.available_vials === 'number' && !isNaN(v.available_vials);
                const vialCount = hasVials ? v.available_vials! : 0;
                const vialDisplay = hasVials
                  ? `${vialCount.toLocaleString()} ${vialCount === 1 ? 'vial' : 'vials'}`
                  : (v.availability_status || (v.in_stock ? 'In Stock' : 'Out of Stock'));

                return (
                  <Fragment key={rowId}>
                    <tr
                      className={`public-stock-row ${isExpanded ? 'is-expanded' : ''}`}
                      onClick={() => toggleRow(rowId)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleRow(rowId);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-expanded={isExpanded}
                      aria-controls={`details-${rowId}`}
                      aria-label={`${v.vaccine_name}, ${v.category}, ${vialDisplay}, stock status ${statusLabel}. Press Enter to toggle details.`}
                    >
                      <td className="col-vaccine">
                        <span className="vaccine-name-text">{v.vaccine_name}</span>
                      </td>
                      <td className="col-category">
                        <span className="vaccine-category-text">{v.category}</span>
                      </td>
                      <td className="col-available">
                        <span className="vaccine-available-text">
                          {hasVials ? (
                            <>
                              <strong>{vialCount.toLocaleString()}</strong>{' '}
                              <span>{vialCount === 1 ? 'vial' : 'vials'}</span>
                            </>
                          ) : (
                            <strong>{vialDisplay}</strong>
                          )}
                        </span>
                      </td>
                      <td className="col-status">
                        <span className={`stock-status-badge is-${statusKey}`}>
                          <span className="stock-status-dot" aria-hidden="true" />
                          <span className="stock-status-label">{statusLabel}</span>
                        </span>
                      </td>
                      <td className="col-expand">
                        <span className={`expand-btn-wrapper ${isExpanded ? 'is-expanded' : ''}`} aria-hidden="true">
                          <svg
                            className="expand-chevron-icon"
                            viewBox="0 0 24 24"
                            width="15"
                            height="15"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </span>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr id={`details-${rowId}`} className="public-stock-expanded-row">
                        <td colSpan={5} className="col-expanded-cell">
                          <div className="expanded-details-container">
                            <div className="expanded-details-grid">
                              <div className="expanded-detail-card">
                                <div className="detail-card-header">
                                  <svg className="detail-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                  </svg>
                                  <span className="detail-meta-label">Active Batches</span>
                                </div>
                                <span className="detail-meta-value">
                                  {typeof v.active_batches === 'number'
                                    ? `${v.active_batches} active ${v.active_batches === 1 ? 'batch' : 'batches'}`
                                    : 'Recorded in inventory'}
                                </span>
                              </div>

                              {hasVials && (
                                <div className="expanded-detail-card">
                                  <div className="detail-card-header">
                                    <svg className="detail-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                    </svg>
                                    <span className="detail-meta-label">Available Volume</span>
                                  </div>
                                  <span className="detail-meta-value">
                                    {vialCount.toLocaleString()} available {vialCount === 1 ? 'vial' : 'vials'}
                                  </span>
                                </div>
                              )}

                              {v.administration_route && (
                                <div className="expanded-detail-card">
                                  <div className="detail-card-header">
                                    <svg className="detail-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                      <circle cx="12" cy="12" r="10" />
                                      <polyline points="12 6 12 12 14 14" />
                                    </svg>
                                    <span className="detail-meta-label">Administration Route</span>
                                  </div>
                                  <span className="detail-meta-value">{v.administration_route}</span>
                                </div>
                              )}

                              {v.storage_temperature_notes && (
                                <div className="expanded-detail-card">
                                  <div className="detail-card-header">
                                    <svg className="detail-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                                    </svg>
                                    <span className="detail-meta-label">Storage Conditions</span>
                                  </div>
                                  <span className="detail-meta-value">{v.storage_temperature_notes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="public-stock-footnote">
        Availability updates every minute. Counts reflect active, unexpired inventory and may change during clinic hours.
      </p>
    </section>
  );
}
