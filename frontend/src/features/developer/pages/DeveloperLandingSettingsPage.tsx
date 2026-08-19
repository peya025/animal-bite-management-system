import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';
import { Icon } from '../../../shared/components/ui/Icon';
import '../styles/DeveloperDatabaseExplorer.css';

interface LinkItem {
  label: string;
  url: string;
}

interface LandingSettings {
  app_short_name: string;
  app_full_name: string;
  abtc_brand_title: string;
  abtc_description: string;
  developed_for_text: string;
  quick_links: LinkItem[];
  support_links: LinkItem[];
  system_info_links: LinkItem[];
  operating_schedule: string;
  operating_hours: string;
  registration_window: string;
  requirement_notice: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export default function DeveloperLandingSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [settings, setSettings] = useState<LandingSettings>({
    app_short_name: 'TABTA',
    app_full_name: 'TAGOLOAN ANIMAL BITE TREATMENT CENTER',
    abtc_brand_title: 'ABTC',
    abtc_description: 'Animal Bite Management & Monitoring System',
    developed_for_text: 'Developed for Animal Bite Treatment Center',
    quick_links: [
      { label: 'About System', url: '#about' },
      { label: 'Help Center', url: '#help' },
      { label: 'Staff Login', url: '#login' },
    ],
    support_links: [
      { label: 'Contact Support', url: '#contact' },
      { label: 'User Guides', url: '#guides' },
      { label: 'FAQs', url: '#faqs' },
    ],
    system_info_links: [
      { label: 'Features', url: '#features' },
      { label: 'Security', url: '#security' },
      { label: 'Report Issue', url: '#report' },
    ],
    operating_schedule: 'SCHEDULE: MONDAYS & THURSDAYS',
    operating_hours: '8:00 AM – 5:00 PM',
    registration_window: '8:00 AM – 10:00 AM (Come Early!)',
    requirement_notice: 'Please bring updated PhilHealth MDR',
  });

  useEffect(() => {
    fetch(`${API_BASE}/landing-page-settings`)
      .then(res => res.json())
      .then(data => {
        if (data && data.app_short_name) {
          setSettings({
            app_short_name: data.app_short_name || 'TABTA',
            app_full_name: data.app_full_name || 'TAGOLOAN ANIMAL BITE TREATMENT CENTER',
            abtc_brand_title: data.abtc_brand_title || 'ABTC',
            abtc_description: data.abtc_description || 'Animal Bite Management & Monitoring System',
            developed_for_text: data.developed_for_text || 'Developed for Animal Bite Treatment Center',
            quick_links: data.quick_links || [
              { label: 'About System', url: '#about' },
              { label: 'Help Center', url: '#help' },
              { label: 'Staff Login', url: '#login' },
            ],
            support_links: data.support_links || [
              { label: 'Contact Support', url: '#contact' },
              { label: 'User Guides', url: '#guides' },
              { label: 'FAQs', url: '#faqs' },
            ],
            system_info_links: data.system_info_links || [
              { label: 'Features', url: '#features' },
              { label: 'Security', url: '#security' },
              { label: 'Report Issue', url: '#report' },
            ],
            operating_schedule: data.operating_schedule || 'SCHEDULE: MONDAYS & THURSDAYS',
            operating_hours: data.operating_hours || '8:00 AM – 5:00 PM',
            registration_window: data.registration_window || '8:00 AM – 10:00 AM (Come Early!)',
            requirement_notice: data.requirement_notice || 'Please bring updated PhilHealth MDR',
          });
        }
      })
      .catch(err => console.error('Failed to load settings:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/developer/landing-page-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      const resData = await response.json();
      if (response.ok) {
        setSuccessMsg('Landing Page & Footer Settings saved successfully!');
        localStorage.setItem('landingSettings', JSON.stringify(settings));
      } else {
        setErrorMsg(resData.message || 'Failed to save settings');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLinkChange = (
    category: 'quick_links' | 'support_links' | 'system_info_links',
    index: number,
    field: 'label' | 'url',
    value: string
  ) => {
    const updated = [...settings[category]];
    updated[index][field] = value;
    setSettings({ ...settings, [category]: updated });
  };

  const addLink = (category: 'quick_links' | 'support_links' | 'system_info_links') => {
    setSettings({
      ...settings,
      [category]: [...settings[category], { label: 'New Link', url: '#' }],
    });
  };

  const removeLink = (category: 'quick_links' | 'support_links' | 'system_info_links', index: number) => {
    const updated = settings[category].filter((_, i) => i !== index);
    setSettings({ ...settings, [category]: updated });
  };

  return (
    <div style={{ padding: '0', maxWidth: '100%', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      {/* Minimalist Dashboard Header */}
      <div className="sd-dash-header">
        <div>
          <h1>Developer Settings</h1>
          <p>Landing Page &amp; Footer Customizer</p>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13, color: '#9ca3af' }}>
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
            >Dashboard</button>
            <span>›</span>
            <span style={{ color: '#6b7280' }}>Developer Settings</span>
          </div>
        </div>
        <button 
          type="button"
          className="db-explorer-back-btn"
          onClick={() => navigate(ROUTES.DASHBOARD)} 
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Developer Tools Navigation Switcher Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, borderBottom: '2px solid #e2e8f0', paddingBottom: 2 }}>
        <button
          type="button"
          onClick={() => navigate(ROUTES.DEVELOPER_SETTINGS)}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: '3px solid #10b981',
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 700,
            color: '#065f46',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name="developerSettings" size={16} color="#065f46" /> Landing & Footer Customizer
        </button>
        <button
          type="button"
          onClick={() => navigate(ROUTES.DATABASE_EXPLORER)}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: '3px solid transparent',
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 500,
            color: '#64748b',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name="databaseExplorer" size={16} color="#64748b" /> Database Explorer (XAMPP Schema Inspector)
        </button>
      </div>

      {successMsg && (
        <div style={{ padding: '0.75rem 1rem', background: '#e8f5ed', color: 'var(--primary)', border: '1px solid #d7ebdf', borderRadius: '0.5rem', marginBottom: '1.25rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <Icon name="check" size={16} color="var(--primary)" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '0.5rem', marginBottom: '1.25rem', fontWeight: 500, fontSize: '0.85rem' }}>
          {errorMsg}
        </div>
      )}

      {loading ? (
        <p style={{ padding: '2rem', color: 'var(--primary)', fontWeight: 400 }}>Loading developer settings...</p>
      ) : (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Section 1: App Identity */}
          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e0eae3', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <Icon name="clinicSetup" size={16} color="var(--primary)" /> Application Identity & Header
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 500, fontSize: '0.8125rem', marginBottom: '0.35rem', color: '#475569' }}>App Short Name (Abbreviation)</label>
                <input
                  type="text"
                  className="db-explorer-input"
                  value={settings.app_short_name}
                  onChange={e => setSettings({ ...settings, app_short_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 500, fontSize: '0.8125rem', marginBottom: '0.35rem', color: '#475569' }}>App Full Name / Subtitle</label>
                <input
                  type="text"
                  className="db-explorer-input"
                  value={settings.app_full_name}
                  onChange={e => setSettings({ ...settings, app_full_name: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Operating Schedule & Requirements */}
          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e0eae3', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <Icon name="queue" size={16} color="var(--primary)" /> Schedule & Requirement Notices
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 500, fontSize: '0.8125rem', marginBottom: '0.35rem', color: '#475569' }}>Operating Schedule Title</label>
                <input
                  type="text"
                  className="db-explorer-input"
                  value={settings.operating_schedule}
                  onChange={e => setSettings({ ...settings, operating_schedule: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 500, fontSize: '0.8125rem', marginBottom: '0.35rem', color: '#475569' }}>Operating Hours</label>
                <input
                  type="text"
                  className="db-explorer-input"
                  value={settings.operating_hours}
                  onChange={e => setSettings({ ...settings, operating_hours: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 500, fontSize: '0.8125rem', marginBottom: '0.35rem', color: '#475569' }}>Registration Window Notice</label>
                <input
                  type="text"
                  className="db-explorer-input"
                  value={settings.registration_window}
                  onChange={e => setSettings({ ...settings, registration_window: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 500, fontSize: '0.8125rem', marginBottom: '0.35rem', color: '#475569' }}>Mandatory Patient Requirement</label>
                <input
                  type="text"
                  className="db-explorer-input"
                  value={settings.requirement_notice}
                  onChange={e => setSettings({ ...settings, requirement_notice: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Footer Brand Column */}
          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e0eae3', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <Icon name="reports" size={16} color="var(--primary)" /> Footer Column 1: Brand & Bio
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 500, fontSize: '0.8125rem', marginBottom: '0.35rem', color: '#475569' }}>Footer Brand Title (e.g. ABTC)</label>
                <input
                  type="text"
                  className="db-explorer-input"
                  value={settings.abtc_brand_title}
                  onChange={e => setSettings({ ...settings, abtc_brand_title: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 500, fontSize: '0.8125rem', marginBottom: '0.35rem', color: '#475569' }}>Developed For Text</label>
                <input
                  type="text"
                  className="db-explorer-input"
                  value={settings.developed_for_text}
                  onChange={e => setSettings({ ...settings, developed_for_text: e.target.value })}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontWeight: 500, fontSize: '0.8125rem', marginBottom: '0.35rem', color: '#475569' }}>System Description</label>
                <textarea
                  value={settings.abtc_description}
                  onChange={e => setSettings({ ...settings, abtc_description: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', minHeight: '70px', fontSize: '0.8125rem', fontFamily: 'inherit' }}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Footer Columns (Quick Links, Support, System Info) */}
          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e0eae3', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <Icon name="inventory" size={16} color="var(--primary)" /> Footer Link Columns (Quick Links, Support, System Info)
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
              {/* Quick Links Column */}
              <div>
                <h3 style={{ fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 600 }}>Quick Links</h3>
                {settings.quick_links.map((link, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Label"
                      className="db-explorer-input"
                      value={link.label}
                      onChange={e => handleLinkChange('quick_links', idx, 'label', e.target.value)}
                    />
                    <button type="button" onClick={() => removeLink('quick_links', idx)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', padding: '0 0.5rem', display: 'grid', placeItems: 'center' }}>
                      <Icon name="trash" size={13} color="#991b1b" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addLink('quick_links')} style={{ background: '#e8f5ed', color: 'var(--primary)', border: '1px solid #d7ebdf', padding: '0.35rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 500 }}>
                  <Icon name="plus" size={13} color="var(--primary)" /> Add Link
                </button>
              </div>

              {/* Support Column */}
              <div>
                <h3 style={{ fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 600 }}>Support</h3>
                {settings.support_links.map((link, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Label"
                      className="db-explorer-input"
                      value={link.label}
                      onChange={e => handleLinkChange('support_links', idx, 'label', e.target.value)}
                    />
                    <button type="button" onClick={() => removeLink('support_links', idx)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', padding: '0 0.5rem', display: 'grid', placeItems: 'center' }}>
                      <Icon name="trash" size={13} color="#991b1b" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addLink('support_links')} style={{ background: '#e8f5ed', color: 'var(--primary)', border: '1px solid #d7ebdf', padding: '0.35rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 500 }}>
                  <Icon name="plus" size={13} color="var(--primary)" /> Add Link
                </button>
              </div>

              {/* System Info Column */}
              <div>
                <h3 style={{ fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 600 }}>System Info</h3>
                {settings.system_info_links.map((link, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Label"
                      className="db-explorer-input"
                      value={link.label}
                      onChange={e => handleLinkChange('system_info_links', idx, 'label', e.target.value)}
                    />
                    <button type="button" onClick={() => removeLink('system_info_links', idx)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', padding: '0 0.5rem', display: 'grid', placeItems: 'center' }}>
                      <Icon name="trash" size={13} color="#991b1b" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addLink('system_info_links')} style={{ background: '#e8f5ed', color: 'var(--primary)', border: '1px solid #d7ebdf', padding: '0.35rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 500 }}>
                  <Icon name="plus" size={13} color="var(--primary)" /> Add Link
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                padding: '0.65rem 1.75rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 150ms ease',
              }}
            >
              <Icon name="check" size={16} color="#ffffff" />
              {saving ? 'Saving Changes...' : 'Save Developer Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
