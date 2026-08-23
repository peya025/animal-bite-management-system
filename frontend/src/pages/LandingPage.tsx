import { useState, useEffect, useRef } from 'react';
import { APP_SHORT_NAME } from '../constants';
import GlobalStyles from '@mui/material/GlobalStyles';
import { landingPageStyles } from '../styles/LandingPage.styles';
import antiviralVaccineImg from '../assets/image.png';
import rorOrModified from '../assets/roror-modified.png';
import { ROUTES } from '../shared/config/routes';
import ThemeToggle from '../shared/components/ThemeToggle';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  VaccineIcon,
  Shield01Icon,
  BandageIcon,
  ThermometerColdIcon,
  ClockAlertIcon,
  Alert02Icon,
  AlertCircleIcon,
  Book02Icon,
  Video01Icon,
  HelpCircleIcon,
  Settings01Icon,
  InjectionIcon,
} from '@hugeicons/core-free-icons';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const [dynSettings, setDynSettings] = useState({
    app_short_name: APP_SHORT_NAME || 'TABTA',
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
      { label: 'User Guides', url: '#help' },
      { label: 'FAQs', url: '#help' },
    ],
    system_info_links: [
      { label: 'Features', url: '#about' },
      { label: 'Security', url: '#about' },
      { label: 'Report Issue', url: '#contact' },
    ],
    operating_schedule: 'SCHEDULE: MONDAYS & THURSDAYS',
    operating_hours: '8:00 AM – 5:00 PM',
    registration_window: '8:00 AM – 10:00 AM (Come Early!)',
    requirement_notice: 'Please bring updated PhilHealth MDR',
  });

  // Live Public Vaccine Availability State
  const [vaccineInfo, setVaccineInfo] = useState<{
    facility_name: string;
    facility_address: string;
    operating_schedule: string;
    cold_chain_status: string;
    who_pep_compliant: boolean;
    vaccines: any[];
  } | null>(null);
  const [activeCat, setActiveCat] = useState<string>('All');
  const [loadingVaccines, setLoadingVaccines] = useState(true);

  useEffect(() => {
    fetch('/api/landing-page-settings')
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

    // Fetch Live Vaccine Availability & Catalog
    fetch('/api/public/vaccine-availability')
      .then(res => res.json())
      .then(data => {
        setVaccineInfo(data);
        setLoadingVaccines(false);
      })
      .catch(() => {
        setLoadingVaccines(false);
      });

    // Check if setup is needed on page load
    const checkSetup = async () => {
      try {
        const response = await fetch('/api/setup/check-needed', {
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
      const response = await fetch('/api/setup/check-needed', {
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

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 400; // Scroll by approximately one card width + gap
      const newScrollPosition = direction === 'left' 
        ? carouselRef.current.scrollLeft - scrollAmount
        : carouselRef.current.scrollLeft + scrollAmount;
      
      carouselRef.current.scrollTo({
        left: newScrollPosition,
        behavior: 'smooth'
      });
    }
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
              <li><a href="#emergency">EMERGENCY PROTOCOL</a></li>
              <li><a href="#about">SERVICES</a></li>
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

        {/* ── SECTION: Emergency Animal Bite Action Protocol ── */}
        <section id="emergency" style={{ maxWidth: '1300px', margin: '0 auto', padding: '3.5rem 1.5rem 0' }}>
          <div className="emergency-bite-banner">
            <div className="emergency-banner-top">
              <div className="emergency-alert-icon">
                <HugeiconsIcon icon={Alert02Icon} size={28} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#f87171' }}>
                  Bitten or Scratched by an Animal? Immediate Action Required!
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#cbd5e1', margin: '0.25rem 0 0' }}>
                  Rabies is 100% fatal once symptoms appear, but 100% preventable with immediate Post-Exposure Prophylaxis (PEP).
                </p>
              </div>
            </div>

            <div className="emergency-steps-grid">
              <div className="emergency-step-card">
                <div className="step-number-tag">1</div>
                <h4>Wash with Soap &amp; Water</h4>
                <p>Wash the bite/scratch wound thoroughly under running water with soap for at least 15 continuous minutes.</p>
              </div>

              <div className="emergency-step-card">
                <div className="step-number-tag">2</div>
                <h4>Apply Antiseptic</h4>
                <p>Disinfect with Povidone-iodine (Betadine) or 70% alcohol. Do NOT apply garlic, stone, or caustic substances.</p>
              </div>

              <div className="emergency-step-card">
                <div className="step-number-tag">3</div>
                <h4>Visit Tagoloan ABTC</h4>
                <p>Proceed immediately to our clinic on clinic days for exposure grading (Category I, II, or III) and physician assessment.</p>
              </div>

              <div className="emergency-step-card">
                <div className="step-number-tag">4</div>
                <h4>Complete Regimen</h4>
                <p>Receive your WHO-compliant Anti-Rabies Vaccine (ARV) and Immunoglobulin (RIG) on all scheduled follow-up dates.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION: Live Vaccine Availability & Regimen Catalog ── */}
        <section id="vaccines" className="vaccine-tracker-section">
          <div className="vaccine-tracker-container">
            <div className="vaccine-tracker-header">
              <p style={{ color: '#059669', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>
                | Live Clinic Inventory &amp; Regimen Catalog
              </p>
              <h2>Available Vaccines &amp; Biologicals</h2>
              <p>
                Real-time stock status and official clinical administration protocols at Tagoloan Animal Bite Treatment Center.
              </p>
            </div>

            {/* Status Summary & Cold-Chain Bar */}
            <div className="vaccine-status-summary-bar">
              <div className="status-badge-item">
                <div className="status-indicator-dot"></div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                    {vaccineInfo?.cold_chain_status || 'Monitored Cold-Chain (+2°C to +8°C Active)'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                    FIFO Batch Quality &amp; Potency Guaranteed
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>FACILITY SCHEDULE</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                    {dynSettings.operating_schedule || 'Mondays & Thursdays'} ({dynSettings.operating_hours || '8:00 AM – 5:00 PM'})
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>REGISTRATION WINDOW</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#059669' }}>
                    {dynSettings.registration_window || '8:00 AM – 10:00 AM'}
                  </span>
                </div>
              </div>
            </div>

            {/* 1. Category Filter Tabs with Single Active State */}
            <div className="vaccine-cat-tabs" role="tablist" aria-label="Vaccine category filters">
              {[
                { key: 'All', label: 'All Vaccines' },
                { key: 'Anti-Rabies Vaccines (ARV)', label: 'Anti-Rabies (ARV)' },
                { key: 'Rabies Immunoglobulins (RIG)', label: 'Immunoglobulins (RIG)' },
                { key: 'Tetanus & Toxoids', label: 'Tetanus & Toxoids' },
              ].map((item) => (
                <button
                  key={item.key}
                  role="tab"
                  aria-selected={activeCat === item.key}
                  className={`vaccine-cat-tab-btn ${activeCat === item.key ? 'active' : ''}`}
                  onClick={() => setActiveCat(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* 2. Grouped Sections */}
            {loadingVaccines ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <p>Loading live vaccine catalog…</p>
              </div>
            ) : (
              <div>
                {[
                  {
                    key: 'Anti-Rabies Vaccines (ARV)',
                    title: 'Anti-Rabies Vaccines (ARV)',
                    icon: <HugeiconsIcon icon={VaccineIcon} size={22} color="#059669" />,
                    badgeLabel: 'Anti-Rabies',
                    contextLine: 'Administered via Intradermal (ID, 0.1 mL at 2 sites) or Intramuscular (IM) according to WHO PEP protocol.',
                    defaultRoute: 'Intradermal (ID) / Intramuscular (IM)',
                  },
                  {
                    key: 'Rabies Immunoglobulins (RIG)',
                    title: 'Rabies Immunoglobulins (RIG)',
                    icon: <HugeiconsIcon icon={Shield01Icon} size={22} color="#0284c7" />,
                    badgeLabel: 'Immunoglobulin',
                    contextLine: 'Passive immunization administered via local infiltration around wound sites on Day 0 for Category III bite exposures.',
                    defaultRoute: 'Local Wound Infiltration',
                  },
                  {
                    key: 'Tetanus & Toxoids',
                    title: 'Tetanus & Toxoids',
                    icon: <HugeiconsIcon icon={BandageIcon} size={22} color="#b45309" />,
                    badgeLabel: 'Tetanus',
                    contextLine: 'Wound infection prophylaxis administered via Intramuscular (IM) injection according to patient immunization history.',
                    defaultRoute: 'Intramuscular (IM)',
                  },
                ]
                  .filter((sec) => activeCat === 'All' || activeCat === sec.key)
                  .map((sec) => {
                    const sectionVaccines = (vaccineInfo?.vaccines || []).filter(
                      (v: any) => v.category === sec.key
                    );

                    if (sectionVaccines.length === 0 && activeCat !== 'All') {
                      return null;
                    }

                    return (
                      <section key={sec.key} className="vaccine-group-section" aria-labelledby={`sec-${sec.key}`}>
                        {/* Section Header with Shared Context Line */}
                        <div className="vaccine-group-header">
                          <h3 id={`sec-${sec.key}`} className="vaccine-group-title">
                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>{sec.icon}</span>
                            <span>{sec.title}</span>
                          </h3>
                          <p className="vaccine-group-context-line">
                            {sec.contextLine}
                          </p>
                        </div>

                        {/* Cards Grid */}
                        <div className="vaccine-cards-grid">
                          {sectionVaccines.map((v: any) => {
                            // Split name and formulation cleanly if in parentheses
                            let mainTitle = v.vaccine_name;
                            let formulation = '';
                            const match = v.vaccine_name.match(/^(.*?)\s*\((.*?)\)$/);
                            if (match) {
                              mainTitle = match[1];
                              formulation = match[2];
                            }

                            // Storage note cleanup (remove duplicate discard note from routine storage string)
                            let cleanStorage = v.storage_temperature_notes || 'Store at +2°C to +8°C. Monitored Cold-Chain.';
                            if (v.open_vial_hours) {
                              cleanStorage = cleanStorage.replace(/Reconstituted.*?within\s*\d+\s*hours\.?/i, '').trim();
                              cleanStorage = cleanStorage.replace(/Discard.*?within\s*\d+\s*hours\.?/i, '').trim();
                            }

                            // Route override: only show if differs from group default
                            const hasRouteOverride =
                              v.administration_route &&
                              v.administration_route.trim().toLowerCase() !== sec.defaultRoute.trim().toLowerCase();

                            // Badge: show status only when low or out of stock; otherwise show clean category tag
                            const isLowStock = v.availability_status === 'Limited Stock';
                            const isOutOfStock = v.availability_status === 'Out of Stock';

                            return (
                              <article className="vaccine-pub-card" key={v.id || v.vaccine_name}>
                                {/* Top Header Row: One badge only */}
                                <div className="vaccine-pub-header-row">
                                  {isLowStock ? (
                                    <span className="vaccine-single-badge badge-low-stock">
                                      <HugeiconsIcon icon={AlertCircleIcon} size={13} />
                                      Low Stock
                                    </span>
                                  ) : isOutOfStock ? (
                                    <span className="vaccine-single-badge badge-out-of-stock">
                                      <HugeiconsIcon icon={AlertCircleIcon} size={13} />
                                      Currently Unavailable
                                    </span>
                                  ) : (
                                    <span className="vaccine-single-badge badge-cat-tag">
                                      {sec.badgeLabel}
                                    </span>
                                  )}
                                </div>

                                {/* Vaccine Brand Name (15-16px, bold) */}
                                <h4 className="vaccine-pub-title">{mainTitle}</h4>

                                {/* Formulation / Strength */}
                                {formulation && (
                                  <div className="vaccine-pub-formulation">{formulation}</div>
                                )}

                                {/* Route text ONLY if differs from section default */}
                                {hasRouteOverride && (
                                  <div className="vaccine-pub-route-override">
                                    <HugeiconsIcon icon={InjectionIcon} size={13} color="#0369a1" />
                                    <span>Route: {v.administration_route}</span>
                                  </div>
                                )}

                                {/* Card Facts Pinned to Bottom */}
                                <div className="vaccine-facts-footer">
                                  {/* Routine Informational Storage Note */}
                                  <div className="vaccine-storage-fact">
                                    <HugeiconsIcon icon={ThermometerColdIcon} size={15} color="#6b7280" />
                                    <span>{cleanStorage || 'Store at +2°C to +8°C. Cold-chain required.'}</span>
                                  </div>

                                  {/* Urgent Discard-After-Opening Warning (Distinct Amber Warning) */}
                                  {v.open_vial_hours && (
                                    <div className="vaccine-discard-warning" role="note">
                                      <HugeiconsIcon icon={ClockAlertIcon} size={15} color="#92400e" />
                                      <span>
                                        <strong>Discard open vial after {v.open_vial_hours} hours</strong>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
              </div>
            )}
          </div>
        </section>

        <section id="about" className="services-section">
          <div className="section-header">
            <p className="section-tag">| Our Services</p>
            <h2>About The System</h2>
          </div>

          <div className="carousel-container">
            <button
              className="carousel-nav-btn carousel-nav-left"
              onClick={() => scrollCarousel('left')}
              style={{
                position: 'absolute',
                left: '-20px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>

            <div className="services-carousel" ref={carouselRef}>
              <div className="service-card">
                <div className="service-image">
                  <img src={antiviralVaccineImg} alt="WHO Protocol Compliance" />
                  <div className="service-icon-badge service-badge-red">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                  </div>
                </div>
                <div className="service-content">
                  <h3>WHO Protocol Compliance</h3>
                  <p>Automated 5-dose vaccination schedule following WHO rabies PEP guidelines (Day 0, 3, 7, 14, and 28)</p>
                  <button className="service-btn">Read More</button>
                </div>
              </div>

              <div className="service-card">
                <div className="service-image">
                  <img src={antiviralVaccineImg} alt="Patient Management" />
                  <div className="service-icon-badge service-badge-orange">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                </div>
                <div className="service-content">
                  <h3>Patient Management</h3>
                  <p>Complete patient registry with auto-generated patient numbers and comprehensive medical records</p>
                  <button className="service-btn">Read More</button>
                </div>
              </div>

              <div className="service-card">
                <div className="service-image">
                  <img src={antiviralVaccineImg} alt="Queue Management" />
                  <div className="service-icon-badge service-badge-green">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6"/>
                      <line x1="8" y1="12" x2="21" y2="12"/>
                      <line x1="8" y1="18" x2="21" y2="18"/>
                      <line x1="3" y1="6" x2="3.01" y2="6"/>
                      <line x1="3" y1="12" x2="3.01" y2="12"/>
                      <line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                  </div>
                </div>
                <div className="service-content">
                  <h3>Queue Management</h3>
                  <p>Real-time patient queue with priority management and status tracking for efficient workflows</p>
                  <button className="service-btn">Read More</button>
                </div>
              </div>

              <div className="service-card">
                <div className="service-image">
                  <img src={antiviralVaccineImg} alt="Role-Based Access" />
                  <div className="service-icon-badge service-badge-blue">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                </div>
                <div className="service-content">
                  <h3>Role-Based Access</h3>
                  <p>Secure access for Admin, Registration, Triage, and Treatment staff with appropriate permissions</p>
                  <button className="service-btn">Read More</button>
                </div>
              </div>

              <div className="service-card">
                <div className="service-image">
                  <img src={antiviralVaccineImg} alt="Real-Time Reporting" />
                  <div className="service-icon-badge service-badge-purple">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <line x1="12" y1="20" x2="12" y2="10"/>
                      <line x1="18" y1="20" x2="18" y2="4"/>
                      <line x1="6" y1="20" x2="6" y2="16"/>
                    </svg>
                  </div>
                </div>
                <div className="service-content">
                  <h3>Real-Time Reporting</h3>
                  <p>Live bite case monitoring, vaccination tracking, and comprehensive statistics dashboard</p>
                  <button className="service-btn">Read More</button>
                </div>
              </div>

              <div className="service-card">
                <div className="service-image">
                  <img src={antiviralVaccineImg} alt="Data Security" />
                  <div className="service-icon-badge service-badge-teal">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                </div>
                <div className="service-content">
                  <h3>Data Security</h3>
                  <p>Secure data storage with regular backups and compliance with healthcare data standards</p>
                  <button className="service-btn">Read More</button>
                </div>
              </div>
            </div>

            <button
              className="carousel-nav-btn carousel-nav-right"
              onClick={() => scrollCarousel('right')}
              style={{
                position: 'absolute',
                right: '-20px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </section>

        <section className="features-hero">
          <div className="features-hero-container">
            <div className="features-hero-content">
              <h2 className="features-hero-title">
                <span className="title-creative">innovative</span>
                <span className="title-solutions">healthcare</span>
                <span className="title-solutions-cyan">solutions</span>
              </h2>
              <p className="features-hero-description">
                Comprehensive animal bite management system providing efficient, 
                WHO-compliant care for animal bite incidents with streamlined 
                patient management and vaccination tracking.
              </p>
              <button onClick={handleSignIn} className="features-hero-btn">
                GET STARTED
              </button>
            </div>
            
            <div className="features-hero-illustration">
              <img 
                src={rorOrModified} 
                alt="Healthcare Solutions Illustration" 
              />
            </div>
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
              <a href="#contact" className="help-link">Watch now →</a>
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
                    <a href={link.url}>{link.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-section">
            <h5>Support</h5>
            <ul>
              {dynSettings.support_links && dynSettings.support_links.map((link: any, idx: number) => (
                <li key={idx}><a href={link.url}>{link.label}</a></li>
              ))}
            </ul>
          </div>

          <div className="footer-section">
            <h5>System Info</h5>
            <ul>
              {dynSettings.system_info_links && dynSettings.system_info_links.map((link: any, idx: number) => (
                <li key={idx}><a href={link.url}>{link.label}</a></li>
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
