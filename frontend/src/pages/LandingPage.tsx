import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../shared/services/api';
import PublicVaccineAvailability from '../features/inventory/components/PublicVaccineAvailability';
import { APP_SHORT_NAME } from '../constants';
import GlobalStyles from '@mui/material/GlobalStyles';
import { landingPageStyles } from '../styles/LandingPage.styles';
import { ROUTES } from '../shared/config/routes';
import ThemeToggle from '../shared/components/ThemeToggle';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Book02Icon,
  Video01Icon,
  HelpCircleIcon,
  Settings01Icon,
} from '@hugeicons/core-free-icons';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [dynSettings, setDynSettings] = useState({
    app_short_name: APP_SHORT_NAME || 'TABTA',
    app_full_name: 'TAGOLOAN ANIMAL BITE TREATMENT CENTER',
    abtc_brand_title: 'ABTC',
    abtc_description: 'Animal Bite Management & Monitoring System',
    developed_for_text: 'Developed for Animal Bite Treatment Center',
    quick_links: [
      { label: 'YouTube Tutorials', url: '#tutorials' },
      { label: 'Help Center', url: '#help' },
      { label: 'Staff Login', url: '#login' },
    ],
    support_links: [
      { label: 'Contact Support', url: '#contact' },
      { label: 'User Guides', url: '#help' },
      { label: 'FAQs', url: '#help' },
    ],
    system_info_links: [
      { label: 'YouTube Tutorials', url: '#tutorials' },
      { label: 'Help Center', url: '#help' },
      { label: 'Report Issue', url: '#contact' },
    ],
    operating_schedule: 'SCHEDULE: MONDAYS & THURSDAYS',
    operating_hours: '8:00 AM – 5:00 PM',
    registration_window: '8:00 AM – 10:00 AM (Come Early!)',
    requirement_notice: 'Please bring updated PhilHealth MDR',
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/landing-page-settings`)
      .then(res => res.json())
      .then(data => {
        if (data && data.app_short_name) {
          setDynSettings(prev => ({
            ...prev,
            ...data,
          }));
        }
      })
      .catch(() => console.log('Using default landing page settings'));

    // Check if setup is needed on page load
    const checkSetup = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/setup/check-needed`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          // If setup is needed, redirect to setup wizard
          if (data.needs_setup === true) {
            window.location.href = ROUTES.SETUP;
            return;
          }
        }
      } catch (error) {
        console.error('Setup check failed:', error);
        // Silently fail and continue
      }
    };

    checkSetup();
  }, []);

  const handleSignIn = async () => {
    // Check if setup is needed BEFORE redirecting to login
    try {
      const response = await fetch(`${API_BASE_URL}/setup/check-needed`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // If setup is needed, redirect to setup wizard
        if (data.needs_setup === true) {
          window.location.href = ROUTES.SETUP;
          return;
        }
      }
    } catch (error) {
      console.error('Setup check failed:', error);
      // Continue to login on error
    }
    
    // Setup is complete or check failed, go to login
    window.location.href = ROUTES.LOGIN;
  };

  return (
    <div className="landing-page">
      <GlobalStyles styles={`
        .gov-header {
          background: var(--white);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .gov-header-top {
          padding: 0.75rem 1.5rem;
          border-bottom: 1px solid var(--gray-200);
        }
        .gov-header-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .gov-brand-block {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .gov-brand-block .nav-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          color: #059669;
        }
        .brand-text-col {
          display: flex;
          flex-direction: column;
        }
        .brand-abbr {
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #059669;
          line-height: 1.1;
        }
        .brand-fullname {
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--brand-text-full);
          text-transform: uppercase;
        }
        .gov-header-right {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        .nav-org-seals {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        @media (max-width: 1024px) {
          .nav-org-seals { display: none; }
        }
        .nav-org-seals .seal-emblem {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.58rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          color: var(--brand-text-full);
          text-transform: uppercase;
          white-space: nowrap;
        }
        .nav-org-seals .seal-badge-icon {
          width: 1.85rem;
          height: 1.85rem;
          flex-shrink: 0;
          border-radius: 9999px;
          background: var(--white);
          border: 1.5px solid #10b981;
          object-fit: cover;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header-signin-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          border: none;
          border-radius: 9999px;
          padding: 0.5rem 1.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 200ms ease, box-shadow 200ms ease;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
          white-space: nowrap;
        }
        .header-signin-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
        }

        /* Full Feature Hero Section Styles */
        .hero-sec {
          background: var(--hero-bg);
          color: #ffffff;
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border-radius: 0;
          width: 100%;
          min-height: 42rem;
          display: flex;
          flex-direction: column;
        }
        .hero-parallax-wrapper {
          position: absolute;
          left: 0;
          right: 0;
          top: -16%;
          height: 132%;
          width: 100%;
          z-index: -10;
        }
        .hero-parallax-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .hero-gradient-mask {
          position: absolute;
          inset: 0;
          z-index: -5;
          background: linear-gradient(180deg, rgba(6, 78, 59, 0.65) 0%, rgba(6, 78, 59, 0.12) 45%, rgba(6, 78, 59, 0.8) 100%);
        }
        .hero-headline-block {
          padding: 2rem 2.5rem 0;
          margin-top: 1rem;
        }
        .hero-headline-block h1 {
          font-size: 5vw;
          font-weight: 700;
          text-transform: uppercase;
          line-height: 0.95;
          letter-spacing: -0.02em;
          margin: 0;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
          color: #ffffff;
        }
        .hero-bottom-grid {
          margin-top: auto;
          padding: 2rem 2.5rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .hero-sub-tagline p {
          font-size: 1.6rem;
          font-weight: 600;
          text-transform: uppercase;
          line-height: 1.1;
          color: rgba(255, 255, 255, 0.95);
          margin: 0;
          text-shadow: 0 2px 10px rgba(0,0,0,0.6);
        }
        .hero-cards-cluster {
          display: flex;
          align-items: flex-end;
          gap: 1rem;
        }
        .hero-membership-glass-card {
          width: 15rem;
          border-radius: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.15);
          padding: 0.75rem;
          box-shadow: 0 10px 30px rgba(6, 78, 59, 0.3);
          backdrop-filter: blur(12px);
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }
        .membership-big-val {
          font-size: 1.875rem;
          font-weight: 700;
          line-height: 1;
        }
        .membership-sub-lbl {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.9);
        }
        .membership-doctor-thumb {
          width: 4rem;
          height: 4rem;
          border-radius: 9999px;
          object-fit: cover;
          border: 2px solid #ffffff;
        }

        /* Row 2 Secondary Subnav Bar */
        .gov-subnav-bar {
          background: var(--gray-50);
          border-bottom: 1px solid var(--gray-200);
          padding: 0.5rem 1.5rem;
        }
        .subnav-links {
          display: flex;
          align-items: center;
          gap: 2rem;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .subnav-links a {
          color: var(--gray-600);
          text-decoration: none;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: color 200ms ease;
          padding: 0.25rem 0;
        }
        .subnav-links a:hover, .subnav-links a.active {
          color: #059669;
          border-bottom: 2px solid #059669;
        }
      `} />
      <GlobalStyles styles={landingPageStyles} />

      {/* Two-Row Government Portal Header */}
      <header className="gov-header">
        {/* Row 1: Brand & Official Seals */}
        <div className="gov-header-top">
          <div className="gov-header-container">
            <div className="gov-brand-block">
              <div className="nav-logo">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <div className="brand-text-col">
                  <span className="brand-abbr">{dynSettings.app_short_name}</span>
                  <span className="brand-fullname">{dynSettings.app_full_name}</span>
                </div>
              </div>
            </div>

            <div className="gov-header-right">
              {/* 3 Org Seals */}
              <div className="nav-org-seals">
                <div className="seal-emblem">
                  <img src="/assets/logo_doh.jpg" alt="Department of Health DOH Seal" className="seal-badge-icon" />
                  <span>Department of Health</span>
                </div>
                <div className="seal-emblem">
                  <img src="/assets/logo_mho_tagoloan.jpg" alt="Municipal Health Office Tagoloan Misamis Oriental Seal" className="seal-badge-icon" />
                  <span>Tagoloan, Misamis Oriental</span>
                </div>
                <div className="seal-emblem">
                  <img src="/assets/logo_rhu.jpg" alt="Rural Health Unit RHU Seal" className="seal-badge-icon" />
                  <span>Rural Health Unit</span>
                </div>
              </div>

              <ThemeToggle />
              <button onClick={handleSignIn} className="header-signin-btn">
                Staff Sign In →
              </button>

              <button 
                className="menu-toggle"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Secondary Navigation Bar (Like CHED Portal Image 2) */}
        <nav className="gov-subnav-bar">
          <div className="gov-header-container">
            <ul className={`subnav-links ${isMenuOpen ? 'active' : ''}`}>
              <li><a href="#" className="active">HOME</a></li>
              <li><a href="#vaccines">AVAILABLE VACCINES</a></li>
              <li><a href="#tutorials">YOUTUBE TUTORIALS</a></li>
              <li><a href="#help">HELP CENTER</a></li>
              <li><a href="#contact">CONTACT SUPPORT</a></li>
            </ul>
          </div>
        </nav>
      </header>

      <main>
        {/* Full Feature Hero Section (Copied from LandingPageTest) */}
        <section className="hero-sec" id="hero">
          <div className="hero-parallax-wrapper">
            <img src="/assets/rhu_tagoloan_hero.jpg" alt="RHU Tagoloan Animal Bite Treatment Center" />
          </div>
          <div className="hero-gradient-mask"></div>

          <div className="hero-headline-block">
            <h1>ANIMAL BITE<br />TREATMENT CENTER</h1>
          </div>

          <div className="hero-bottom-grid">
            <div className="hero-sub-tagline">
              <p>PROMPT PEP CARE.<br />SAVING LIVES IN POBLACION TAGOLOAN, MISAMIS ORIENTAL.</p>
            </div>

            <div className="hero-cards-cluster">
              <div className="hero-membership-glass-card">
                <div className="membership-left-col">
                  <div className="membership-big-val">12K+</div>
                  <div className="membership-sub-lbl">Tagoloan Residents Protected</div>
                </div>
                <img src="/assets/doctor_cat_memphis.png" alt="Cat Doctor Specialist" className="membership-doctor-thumb" />
              </div>
            </div>
          </div>
        </section>

        <PublicVaccineAvailability
          schedule={dynSettings.operating_schedule}
          hours={dynSettings.operating_hours}
          registration={dynSettings.registration_window}
        />

        <section id="tutorials" className="tutorials-section" aria-labelledby="tutorials-title">
          <div className="section-header">
            <p className="section-tag">YouTube Tutorials</p>
            <h2 id="tutorials-title">Learn How to Use the App</h2>
            <p>Step-by-step video guides for staff. Tutorials are coming soon.</p>
          </div>
          <div className="tutorials-grid">
            {[
              { title: 'Getting Started', description: 'Learn how to sign in and navigate the app.' },
              { title: 'Patient Registration & Queue', description: 'Learn how to register patients and manage the queue.' },
              { title: 'Treatment & Follow-ups', description: 'Learn how to record treatments and track follow-up visits.' },
            ].map((tutorial) => (
              <article className="tutorial-card" key={tutorial.title}>
                <div className="tutorial-preview" aria-hidden="true">
                  <HugeiconsIcon icon={Video01Icon} size={48} />
                  <span>YouTube Tutorial</span>
                </div>
                <div className="tutorial-content">
                  <span className="tutorial-status">Coming soon</span>
                  <h3>{tutorial.title}</h3>
                  <p>{tutorial.description}</p>
                  <button className="tutorial-watch" disabled>Watch on YouTube ? Coming soon</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="help" className="help-center">
          <div className="section-header">
            <h2>Help Center</h2>
            <p>Quick guides and resources for staff members</p>
          </div>

          <div className="help-grid">
            <div className="help-card">
              <div className="help-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HugeiconsIcon icon={Book02Icon} size={28} color="#059669" />
              </div>
              <h3>User Guides</h3>
              <p>Step-by-step instructions for each role</p>
              <a href="#contact" className="help-link">Learn more →</a>
            </div>

            <div className="help-card">
              <div className="help-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HugeiconsIcon icon={Video01Icon} size={28} color="#0284c7" />
              </div>
              <h3>Video Tutorials</h3>
              <p>Watch demonstration videos</p>
              <a href="#tutorials" className="help-link">View tutorials →</a>
            </div>

            <div className="help-card">
              <div className="help-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HugeiconsIcon icon={HelpCircleIcon} size={28} color="#d97706" />
              </div>
              <h3>FAQs</h3>
              <p>Common questions and answers</p>
              <a href="#contact" className="help-link">View FAQs →</a>
            </div>

            <div className="help-card">
              <div className="help-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HugeiconsIcon icon={Settings01Icon} size={28} color="#6366f1" />
              </div>
              <h3>Technical Support</h3>
              <p>Get help with system issues</p>
              <a href="#contact" className="help-link">Contact us →</a>
            </div>
          </div>
        </section>

        
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>{dynSettings.abtc_brand_title || dynSettings.app_short_name}</h4>
            <p>{dynSettings.abtc_description}</p>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.5rem' }}>
              {dynSettings.developed_for_text}
            </p>
          </div>

          <div className="footer-section">
            <h5>Quick Links</h5>
            <ul>
              {dynSettings.quick_links && dynSettings.quick_links.map((link: any, idx: number) => (
                <li key={idx}>
                  {link.url === '#login' ? (
                    <button onClick={handleSignIn}>{link.label}</button>
                  ) : (
                    <a href={['#about', '#emergency'].includes(link.url) ? '#tutorials' : link.url}>{['#about', '#emergency'].includes(link.url) ? 'YouTube Tutorials' : link.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-section">
            <h5>Support</h5>
            <ul>
              {dynSettings.support_links && dynSettings.support_links.map((link: any, idx: number) => (
                <li key={idx}><a href={['#about', '#emergency'].includes(link.url) ? '#tutorials' : link.url}>{['#about', '#emergency'].includes(link.url) ? 'YouTube Tutorials' : link.label}</a></li>
              ))}
            </ul>
          </div>

          <div className="footer-section">
            <h5>System Info</h5>
            <ul>
              {dynSettings.system_info_links && dynSettings.system_info_links.map((link: any, idx: number) => (
                <li key={idx}><a href={['#about', '#emergency'].includes(link.url) ? '#tutorials' : link.url}>{['#about', '#emergency'].includes(link.url) ? 'YouTube Tutorials' : link.label}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 {dynSettings.app_full_name}. Powered by {dynSettings.app_short_name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
