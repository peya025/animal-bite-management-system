import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';

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
    fetch('/api/landing-page-settings')
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
      const token = localStorage.getItem('token');
      const response = await fetch('/api/developer/landing-page-settings', {
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
        setSuccessMsg('✅ Landing Page & Footer Settings saved successfully!');
        // Update local storage cache
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
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
        <div>
          <span style={{ background: '#ecfdf5', color: '#059669', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>💻 Developer Role</span>
          <h1 style={{ margin: '0.5rem 0 0', color: '#064e3b' }}>Developer Settings — Landing Page & Footer Customizer</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>Customize dynamic app names, operating schedule, and footer columns dynamically across the application.</p>
        </div>
        <button onClick={() => navigate(ROUTES.DASHBOARD)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>← Back to Dashboard</button>
      </div>

      {successMsg && (
        <div style={{ padding: '1rem', background: '#d1fae5', color: '#065f46', borderRadius: '0.5rem', marginBottom: '1.5rem', fontWeight: 600 }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '0.5rem', marginBottom: '1.5rem', fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}

      {loading ? (
        <p>Loading developer settings...</p>
      ) : (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Section 1: App Identity */}
          <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', color: '#064e3b' }}>🏷️ Application Identity & Header</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>App Short Name (Abbreviation)</label>
                <input
                  type="text"
                  value={settings.app_short_name}
                  onChange={e => setSettings({ ...settings, app_short_name: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>App Full Name / Subtitle</label>
                <input
                  type="text"
                  value={settings.app_full_name}
                  onChange={e => setSettings({ ...settings, app_full_name: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem' }}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Operating Schedule & Requirements */}
          <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', color: '#064e3b' }}>📅 Schedule & Requirement Notices</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>Operating Schedule Title</label>
                <input
                  type="text"
                  value={settings.operating_schedule}
                  onChange={e => setSettings({ ...settings, operating_schedule: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>Operating Hours</label>
                <input
                  type="text"
                  value={settings.operating_hours}
                  onChange={e => setSettings({ ...settings, operating_hours: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>Registration Window Notice</label>
                <input
                  type="text"
                  value={settings.registration_window}
                  onChange={e => setSettings({ ...settings, registration_window: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>Mandatory Patient Requirement</label>
                <input
                  type="text"
                  value={settings.requirement_notice}
                  onChange={e => setSettings({ ...settings, requirement_notice: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem' }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Footer Brand Column */}
          <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', color: '#064e3b' }}>👣 Footer Column 1: Brand & Bio</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>Footer Brand Title (e.g. ABTC)</label>
                <input
                  type="text"
                  value={settings.abtc_brand_title}
                  onChange={e => setSettings({ ...settings, abtc_brand_title: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>Developed For Text</label>
                <input
                  type="text"
                  value={settings.developed_for_text}
                  onChange={e => setSettings({ ...settings, developed_for_text: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem' }}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>System Description</label>
                <textarea
                  value={settings.abtc_description}
                  onChange={e => setSettings({ ...settings, abtc_description: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', minHeight: '70px' }}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Footer Columns (Quick Links, Support, System Info) */}
          <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', color: '#064e3b' }}>🔗 Footer Link Columns (Quick Links, Support, System Info)</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              {/* Quick Links Column */}
              <div>
                <h3 style={{ fontSize: '1rem', color: '#059669', marginBottom: '0.5rem' }}>Quick Links</h3>
                {settings.quick_links.map((link, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Label"
                      value={link.label}
                      onChange={e => handleLinkChange('quick_links', idx, 'label', e.target.value)}
                      style={{ flex: 1, padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', fontSize: '0.8rem' }}
                    />
                    <button type="button" onClick={() => removeLink('quick_links', idx)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', padding: '0 0.5rem' }}>✕</button>
                  </div>
                ))}
                <button type="button" onClick={() => addLink('quick_links')} style={{ background: '#f0fdf4', color: '#059669', border: '1px solid #10b981', padding: '0.35rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.25rem' }}>+ Add Link</button>
              </div>

              {/* Support Column */}
              <div>
                <h3 style={{ fontSize: '1rem', color: '#059669', marginBottom: '0.5rem' }}>Support</h3>
                {settings.support_links.map((link, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Label"
                      value={link.label}
                      onChange={e => handleLinkChange('support_links', idx, 'label', e.target.value)}
                      style={{ flex: 1, padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', fontSize: '0.8rem' }}
                    />
                    <button type="button" onClick={() => removeLink('support_links', idx)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', padding: '0 0.5rem' }}>✕</button>
                  </div>
                ))}
                <button type="button" onClick={() => addLink('support_links')} style={{ background: '#f0fdf4', color: '#059669', border: '1px solid #10b981', padding: '0.35rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.25rem' }}>+ Add Link</button>
              </div>

              {/* System Info Column */}
              <div>
                <h3 style={{ fontSize: '1rem', color: '#059669', marginBottom: '0.5rem' }}>System Info</h3>
                {settings.system_info_links.map((link, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Label"
                      value={link.label}
                      onChange={e => handleLinkChange('system_info_links', idx, 'label', e.target.value)}
                      style={{ flex: 1, padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', fontSize: '0.8rem' }}
                    />
                    <button type="button" onClick={() => removeLink('system_info_links', idx)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', padding: '0 0.5rem' }}>✕</button>
                  </div>
                ))}
                <button type="button" onClick={() => addLink('system_info_links')} style={{ background: '#f0fdf4', color: '#059669', border: '1px solid #10b981', padding: '0.35rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.25rem' }}>+ Add Link</button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.85rem 2rem',
                borderRadius: '9999px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
              }}
            >
              {saving ? 'Saving Changes...' : '💾 Save All Developer Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
