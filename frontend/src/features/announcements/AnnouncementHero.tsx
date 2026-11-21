import { useEffect, useRef, useState, type ReactNode } from 'react';
import { API_BASE_URL } from '../../shared/services/api';
import type { Announcement } from './types';
import './announcements.css';

export default function AnnouncementHero({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/public/announcements`, { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => { if (Array.isArray(data)) setItems(data); })
      .catch(() => { /* Keep the welcome hero available when announcements cannot load. */ });
    return () => controller.abort();
  }, []);
  const go = (index: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  return <>
    {items.filter(item => item.is_urgent).map(item => <aside className="announcement-urgent" key={item.id}>
      <strong>Important notice: {item.title}</strong><p>{item.message}</p>
    </aside>)}
    <div className="announcement-carousel" role="region" aria-roledescription="carousel" aria-label="Clinic welcome and announcements">
      <div className="announcement-track" ref={track} tabIndex={0}
        onScroll={e => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        onKeyDown={e => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault(); go(Math.max(0, Math.min(items.length, active + (e.key === 'ArrowRight' ? 1 : -1))));
          }
        }}>
        <div className="announcement-slide" role="group" aria-label={`1 of ${items.length + 1}: Welcome`}>{children}</div>
        {items.map((item, index) => <article className="announcement-slide announcement-content" key={item.id} role="group" aria-label={`${index + 2} of ${items.length + 1}: ${item.title}`}>
          <div className="announcement-copy"><span className="announcement-eyebrow">{item.is_urgent ? 'Important clinic notice' : 'Clinic announcement'}</span>
            <h2>{item.title}</h2><p>{item.message}</p>
            {item.expires_on && <small>Available through {new Date(`${item.expires_on}T00:00:00`).toLocaleDateString('en-PH', { dateStyle: 'long' })}</small>}
          </div>
          {item.image_url && <img src={item.image_url} alt={item.title} loading="lazy" />}
        </article>)}
      </div>
      {items.length > 0 && <div className="announcement-controls">
        <button type="button" aria-label="Previous slide" disabled={active === 0} onClick={() => go(active - 1)}>←</button>
        <div className="announcement-dots">{['Welcome', ...items.map(item => item.title)].map((title, index) =>
          <button type="button" key={index} aria-label={`Show ${title}`} aria-current={active === index ? 'true' : undefined} onClick={() => go(index)}><span /></button>)}</div>
        <span className="announcement-count" aria-live="polite">{active + 1} / {items.length + 1}</span>
        <button type="button" aria-label="Next slide" disabled={active === items.length} onClick={() => go(active + 1)}>→</button>
      </div>}
    </div>
  </>;
}
