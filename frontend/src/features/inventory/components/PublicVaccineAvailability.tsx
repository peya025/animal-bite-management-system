import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../../shared/services/api';
import './PublicVaccineAvailability.css';

interface PublicVaccine {
  id: string;
  vaccine_name: string;
  category: string;
  administration_route: string | null;
  storage_temperature_notes: string | null;
  availability_status: 'In Stock' | 'Limited Stock' | 'Out of Stock';
  available_vials: number;
  active_batches: number;
}

interface Availability {
  facility_name: string;
  updated_at: string;
  vaccines: PublicVaccine[];
}

export default function PublicVaccineAvailability({ schedule, hours, registration }: {
  schedule: string; hours: string; registration: string;
}) {
  const [data, setData] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/public/vaccine-availability`, {
          signal: controller.signal, cache: 'no-store',
        });
        if (!response.ok) throw new Error('Inventory unavailable');
        const result: Availability = await response.json();
        if (!Array.isArray(result.vaccines)) throw new Error('Invalid inventory');
        if (!controller.signal.aborted) {
          setData(result);
          setError(false);
          setCategory(previous => previous === 'All' || result.vaccines.some(v => v.category === previous) ? previous : 'All');
        }
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        pending = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    const interval = window.setInterval(() => { if (!document.hidden) void load(); }, 60000);
    const onFocus = () => { void load(); };
    window.addEventListener('focus', onFocus);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const vaccines = data?.vaccines ?? [];
  const categories = ['All', ...new Set(vaccines.map(v => v.category))];
  const visible = vaccines.filter(v => (category === 'All' || v.category === category)
    && `${v.vaccine_name} ${v.category}`.toLowerCase().includes(search.trim().toLowerCase()));
  const stockCount = (status: PublicVaccine['availability_status']) => vaccines.filter(v => v.availability_status === status).length;

  return (
    <section id="vaccines" className="public-stock" aria-labelledby="public-stock-title">
      <div className="public-stock-heading">
        <div>
          <p className="public-stock-eyebrow">VACCINE AVAILABILITY</p>
          <h2 id="public-stock-title">Know what’s available.<br /><span>Plan your clinic visit.</span></h2>
          <p>Current vaccine and biological stock at {data?.facility_name ?? 'Tagoloan Animal Bite Treatment Center'}.</p>
        </div>
        <div className="public-stock-sync">
          <span>{error ? 'Update unavailable' : data ? 'Connected to clinic inventory' : 'Checking clinic inventory'}</span>
          {data && <small>Last checked {new Date(data.updated_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })} (PHT)</small>}
          <button type="button" disabled={loading} onClick={() => setRefresh(n => n + 1)}>{loading ? 'Refreshing…' : 'Refresh availability ↻'}</button>
        </div>
      </div>

      <div className="public-stock-summary" aria-label="Inventory summary">
        {([
          ['In stock', stockCount('In Stock'), 'ready', 'More than 10 vials'],
          ['Low stock', stockCount('Limited Stock'), 'limited', '1–10 vials remaining'],
          ['Out of stock', stockCount('Out of Stock'), 'empty', 'No available vials'],
        ] as const).map(([label, count, tone, detail]) => (
          <div key={label} className={`public-stock-stat ${tone}`}>
            <span className="public-stock-dot" aria-hidden="true" />
            <div><span>{label}</span><small>{detail}</small></div>
            <strong>{data ? count : '—'}<small>vaccine types</small></strong>
          </div>
        ))}
      </div>

      <div className="public-stock-toolbar">
        <div className="public-stock-filters" aria-label="Filter by vaccine category">
          {categories.map(item => <button type="button" key={item} aria-pressed={item === category} onClick={() => setCategory(item)}>{item === 'All' ? 'All vaccines' : item}</button>)}
        </div>
        <label className="public-stock-search"><span>Search vaccines</span><input type="search" placeholder="Search vaccine name…" value={search} onChange={event => setSearch(event.target.value)} /></label>
      </div>

      {error && <div className="public-stock-notice" role="alert">Unable to refresh availability. {data ? 'Showing the last successful update; stock may have changed.' : 'Please try refreshing again.'}</div>}
      {loading && !data ? <p className="public-stock-placeholder" role="status">Loading vaccine inventory…</p> : data && (
        <>
          <p className="public-stock-results" aria-live="polite">{visible.length} vaccine {visible.length === 1 ? 'type' : 'types'}{category !== 'All' ? ` in ${category}` : ''}</p>
          {visible.length === 0 ? <div className="public-stock-placeholder"><h3>{vaccines.length ? 'No matching vaccines' : 'No inventory to display yet'}</h3><p>{vaccines.length ? 'Try another name or category.' : 'Vaccine availability will appear when the clinic adds inventory.'}</p></div> : (
            <div className="public-stock-grid">
              {visible.map(v => {
                const tone = v.availability_status === 'In Stock' ? 'ready' : v.availability_status === 'Limited Stock' ? 'limited' : 'empty';
                return <article className={`public-stock-card ${tone}`} key={v.id}>
                  <div className="public-stock-card-top"><span className="public-stock-symbol" aria-hidden="true">✚</span><span className="public-stock-badge"><span className="public-stock-dot" />{tone === 'limited' ? 'Low stock' : v.availability_status}</span></div>
                  <p className="public-stock-category">{v.category}</p>
                  <h3>{v.vaccine_name}</h3>
                  <div className="public-stock-quantity"><strong>{v.available_vials.toLocaleString()}</strong><span>vials available<small>{v.active_batches} active {v.active_batches === 1 ? 'batch' : 'batches'}</small></span></div>
                  {(v.administration_route || v.storage_temperature_notes) && <details><summary>Vaccine details</summary>{v.administration_route && <p><strong>Administration:</strong> {v.administration_route}</p>}{v.storage_temperature_notes && <p><strong>Storage:</strong> {v.storage_temperature_notes}</p>}</details>}
                </article>;
              })}
            </div>
          )}
        </>
      )}
      <div className="public-stock-visit"><div><strong>Clinic schedule</strong><span>{schedule} · {hours}</span></div><div><strong>Registration</strong><span>{registration}</span></div></div>
      <p className="public-stock-footnote">Availability updates every minute. Counts reflect active, unexpired inventory and may change during clinic hours.</p>
    </section>
  );
}
