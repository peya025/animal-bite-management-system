import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../shared/config/routes';

// Real Tagoloan RHU Facility & Staff Assets
const heroMedicalBg = '/assets/rhu_tagoloan_hero.jpg';
const vaccinePepKitImg = '/assets/vaccine_kit_memphis.svg';
const triageFacilityImg = '/assets/triage_facility_memphis.svg';
const headDoctorPortraitImg = '/assets/doctor_cat_memphis.png';
const doctorConsultationImg = '/assets/doctor_consult_memphis.svg';

const SLIDES_DATA = [
  { img: vaccinePepKitImg, brand: "WHO Protocol", title: "PEP Vaccination", cta: "View Schedule →" },
  { img: triageFacilityImg, brand: "Rapid Triage", title: "Emergency Care", cta: "Explore Triage →" },
  { img: doctorConsultationImg, brand: "Expert Doctors", title: "Wound Management", cta: "Book Consult →" }
];

const TRUST_SLIDES = [
  {
    words: ["EXPERT", "URGENT", "RABIES", "CARE"],
    img: headDoctorPortraitImg,
    name: "Dr. Marco Vidal",
    role: "Head Epidemiologist — MHO Tagoloan"
  },
  {
    words: ["SHARPER", "FASTER", "URGENT", "PROTECTION"],
    img: doctorConsultationImg,
    name: "Dr. Elena Sokolova",
    role: "Emergency Rabies Specialist"
  },
  {
    words: ["FUTURE", "HEALTH", "ZERO", "RABIES"],
    img: triageFacilityImg,
    name: "Dr. James Okoro",
    role: "Triage & PEP Lead"
  }
];

export default function LandingPageTest() {
  const navigate = useNavigate();

  // State
  const [isLoaderVisible, setIsLoaderVisible] = useState(true);
  const [isLoaderFilled, setIsLoaderFilled] = useState(false);
  const [isHeroRevealed, setIsHeroRevealed] = useState(false);
  const [sliderIdx, setSliderIdx] = useState(0);
  const [trustIdx, setTrustIdx] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [fname, setFname] = useState('');
  const [femail, setFemail] = useState('');
  const [fdesc, setFdesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Parallax Ref
  const heroBgRef = useRef<HTMLDivElement>(null);

  // 1. Initial Loader and Hero Entrance
  useEffect(() => {
    window.scrollTo(0, 0);

    const fillTimer = setTimeout(() => setIsLoaderFilled(true), 120);
    const hideLoaderTimer = setTimeout(() => {
      setIsLoaderVisible(false);
      setIsHeroRevealed(true);
    }, 1400);

    return () => {
      clearTimeout(fillTimer);
      clearTimeout(hideLoaderTimer);
    };
  }, []);

  // 2. Hero Collection Slider Auto-play
  useEffect(() => {
    const interval = setInterval(() => {
      setSliderIdx((prev) => (prev + 1) % SLIDES_DATA.length);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  // 3. Hero Parallax Scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!heroBgRef.current) return;
      const progress = Math.min(window.scrollY / window.innerHeight, 1);
      heroBgRef.current.style.transform = `translateY(${progress * 12}%)`;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 4. InView Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed-el');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('.inview-el').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Body Scroll Lock for Modal & Menu
  useEffect(() => {
    if (isMenuOpen || isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.removeProperty('overflow');
    }
  }, [isMenuOpen, isModalOpen]);

  // Form Handlers
  const handleSignIn = () => {
    navigate(ROUTES.LOGIN);
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 600);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setIsSuccess(false);
      setFname('');
      setFemail('');
      setFdesc('');
    }, 350);
  };

  const activeSlide = SLIDES_DATA[sliderIdx];
  const activeTrust = TRUST_SLIDES[trustIdx];

  return (
    <div className="baseline-page">
      <style>{`
        /* CSS Reset & Variables */
        :root {
          --background: #ffffff;
          --foreground: #0a0a0a;
          --primary: #10b981;
          --primary-dark: #059669;
          --primary-gradient: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          --brand: #059669; /* Emerald Green motif */
          --brand-deep: #059669; /* Deep Emerald Forest */
          --brand-light: #6ee7b7; /* Bright Emerald */
          --brand-accent: #10b981;
          --navy-bg: #0f2f63;
          --accent-teal: #0b6e97;
          --surface: #f0fdf4; /* Soft green tinted off-white */
          --surface-card: #ffffff;
          --ink: #059669;
          --ink-soft: #4b5563;
          --ghost: #cbd5e1;
          --hairline: #e2e8f0;

          --radius-card: 1.5rem;
          --radius-card-lg: 2rem;
          --radius-pill: 62.5rem;
        }

        .baseline-page {
          min-height: 100vh;
          background: var(--background);
          color: var(--foreground);
          font-family: "Onest", system-ui, -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* Rem Scaling Grid */
        @media (max-width: 1920px) { .baseline-page { font-size: 0.833333vw; } }
        @media (max-width: 1440px) { .baseline-page { font-size: 1.111111vw; } }
        @media (max-width: 1024px) { .baseline-page { font-size: 1.5625vw; } }
        @media (max-width: 640px)  { .baseline-page { font-size: 4.444444vw; } }

        .baseline-main {
          width: 100%;
          padding: 0;
          overflow-x: clip;
        }
        @media (min-width: 640px) {
          .baseline-main { padding: 0; }
        }

        /* Loader Curtain */
        .loader-curtain {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          transition: transform 850ms cubic-bezier(0.65, 0, 0.35, 1);
        }
        .loader-curtain.hidden-curtain {
          transform: translateY(-105%);
          pointer-events: none;
        }
        .loader-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          text-align: center;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 600ms ease, transform 600ms ease;
        }
        .loader-brand.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .loader-seals-trio {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.25rem;
          margin-bottom: 0.75rem;
        }
        .loader-seal-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          transition: transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .loader-seal-item.main-seal {
          transform: translateY(-8px) scale(1.1);
        }
        .loader-seal-label {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: var(--brand-light);
          text-transform: uppercase;
        }
        .loader-logo-seal {
          width: 4.25rem;
          height: 4.25rem;
          border-radius: 50%;
          border: 3px solid #ffffff;
          object-fit: cover;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.35);
          transition: transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 500ms ease;
        }
        .loader-brand.visible .loader-logo-seal {
          animation: sealPulseGlow 1.8s infinite alternate ease-in-out;
        }
        @keyframes sealPulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.5), 0 8px 25px rgba(0, 0, 0, 0.35); }
          100% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0), 0 12px 35px rgba(0, 0, 0, 0.5); }
        }

        .loader-brand-title {
          font-size: 1.25rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }
        .loader-brand-sub {
          font-size: 0.875rem;
          color: var(--brand-light);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .loader-progress-track {
          width: 12rem;
          height: 3px;
          border-radius: var(--radius-pill);
          background: rgba(255, 255, 255, 0.2);
          overflow: hidden;
          position: relative;
        }
        .loader-progress-fill {
          position: absolute;
          inset: 0;
          background: var(--brand-light);
          transform-origin: left;
          transform: scaleX(0);
          transition: transform 1280ms cubic-bezier(0.65, 0, 0.35, 1);
        }
        .loader-progress-fill.filled {
          transform: scaleX(1);
        }

        /* Top Government Seals Header Bar (Flush Full-Width Edge-to-Edge) */
        .seals-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: #ffffff;
          border-radius: 0;
          width: 100%;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }
        .seal-emblem {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0;
          transform: translateY(-16px) scale(0.85);
          transition: opacity 600ms cubic-bezier(0.34, 1.56, 0.64, 1), transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .seals-bar.page-entered .seal-1 { opacity: 1; transform: translateY(0) scale(1); transition-delay: 150ms; }
        .seals-bar.page-entered .seal-2 { opacity: 1; transform: translateY(0) scale(1); transition-delay: 280ms; }
        .seals-bar.page-entered .seal-3 { opacity: 1; transform: translateY(0) scale(1); transition-delay: 400ms; }
        .seal-badge-icon {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: var(--radius-pill);
          background: #ffffff;
          border: 2px solid #ffffff;
          object-fit: cover;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        }

        /* Hero Section */
        .hero-sec {
          background: var(--brand-deep);
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
          will-change: transform;
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

        /* Hero Wave Arc Motif */
        .hero-wave-arc {
          position: absolute;
          top: -2rem;
          left: -2rem;
          width: 24rem;
          height: 24rem;
          border-radius: 50%;
          border: 40px solid rgba(52, 211, 153, 0.15);
          pointer-events: none;
          z-index: -4;
        }

        .hero-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem 0;
          font-size: 0.75rem;
          color: #ffffff;
          position: relative;
          z-index: 20;
        }
        @media (min-width: 640px) {
          .hero-header { padding: 1.5rem 2.5rem 0; }
        }
        .header-left-nav {
          display: none;
          flex: 1;
          gap: 2rem;
        }
        @media (min-width: 1024px) {
          .header-left-nav { display: flex; }
        }
        .header-left-nav a {
          color: rgba(255, 255, 255, 0.9);
          text-decoration: none;
          transition: color 200ms ease;
        }
        .header-left-nav a:hover { color: #ffffff; }

        .header-brand-logo {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.1rem;
        }
        @media (min-width: 1024px) {
          .header-brand-logo { align-items: center; }
        }
        .h-subtext {
          font-size: 0.65rem;
          letter-spacing: 0.18em;
          color: var(--brand-light);
          text-transform: uppercase;
        }
        .h-titletext {
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .header-right-nav {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 1rem;
        }
        .header-signin-btn {
          display: none;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: var(--radius-pill);
          padding: 0.5rem 1.25rem;
          font-family: inherit;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          transition: background 200ms ease;
        }
        @media (min-width: 640px) {
          .header-signin-btn { display: inline-block; }
        }
        .header-signin-btn:hover { background: #ffffff; color: var(--brand-deep); }

        .burger-trigger-btn {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: var(--radius-pill);
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          border: none;
          cursor: pointer;
          transition: background 200ms ease;
        }
        .burger-trigger-btn:hover { background: rgba(255, 255, 255, 0.25); }
        .burger-bar-line { width: 1rem; height: 2px; background: #ffffff; border-radius: 1px; }

        /* Headline Titles */
        .hero-headline-block {
          padding: 1.5rem 1.5rem 0;
          margin-top: 1rem;
        }
        @media (min-width: 640px) {
          .hero-headline-block { padding: 2rem 2.5rem 0; }
        }
        .rhu-banner-header {
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: 0.2em;
          color: var(--brand-light);
          text-transform: uppercase;
          margin-bottom: 0.5rem;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.7);
        }
        .hero-headline-block h1 {
          font-size: 6vw;
          font-weight: 700;
          text-transform: uppercase;
          line-height: 0.95;
          letter-spacing: -0.02em;
          margin: 0;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
        }

        /* Featured Schedule Highlight Card */
        .schedule-highlight-banner {
          margin: 1.5rem 0 0;
          border-radius: var(--radius-card-lg);
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: #ffffff;
          border: 2px solid var(--primary);
          box-shadow: 0 15px 35px rgba(16, 185, 129, 0.25);
          padding: 1.5rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        @media (min-width: 768px) {
          .schedule-highlight-banner {
            margin: 1.5rem 0 0;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .sched-left-info {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        .sched-badge-icon {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: var(--radius-card);
          background: var(--brand-light);
          color: var(--brand-deep);
          display: grid;
          place-items: center;
          font-size: 1.5rem;
          font-weight: 700;
        }
        .sched-days-title {
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          line-height: 1.1;
        }
        .sched-hours-sub {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.9);
          margin-top: 0.25rem;
        }

        .sched-notices-list {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          font-size: 0.8rem;
          color: #ffffff;
        }
        .notice-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(255, 255, 255, 0.15);
          padding: 0.3rem 0.75rem;
          border-radius: var(--radius-pill);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .notice-tag.urgent {
          background: #ef4444;
          color: #ffffff;
          font-weight: 600;
        }

        /* Hero Bottom Cluster */
        .hero-bottom-grid {
          margin-top: auto;
          padding: 1.5rem 1.5rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        @media (min-width: 640px) {
          .hero-bottom-grid {
            padding: 2rem 2.5rem 2.5rem;
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-end;
          }
        }

        .hero-sub-tagline p {
          font-size: 1.8rem;
          font-weight: 600;
          text-transform: uppercase;
          line-height: 1;
          letter-spacing: -0.01em;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
        }

        .hero-cards-cluster {
          display: flex;
          align-items: flex-end;
          gap: 1rem;
        }

        /* Hero Slider Card */
        .hero-slider-glass-card {
          display: none;
          width: 16rem;
          flex-direction: column;
          gap: 0.75rem;
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 700ms ease, transform 700ms ease;
        }
        @media (min-width: 768px) {
          .hero-slider-glass-card { display: flex; }
        }
        .hero-slider-glass-card.revealed {
          opacity: 1;
          transform: translateY(0);
        }
        .slider-glass-inner {
          border-radius: var(--radius-card);
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.1);
          padding: 0.75rem;
          box-shadow: 0 10px 30px rgba(6, 78, 59, 0.3);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .slider-thumb-img {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 0.75rem;
          object-fit: cover;
        }
        .slider-text-group {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .slider-brand-lbl {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--brand-light);
        }
        .slider-title-lbl {
          font-size: 0.7rem;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.9);
        }
        .slider-cta-link {
          font-size: 0.65rem;
          text-decoration: underline;
          color: #ffffff;
          margin-top: 0.25rem;
        }

        /* Membership Card */
        .hero-membership-glass-card {
          width: 100%;
          max-width: 20rem;
          border-radius: var(--radius-card);
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.1);
          padding: 0.75rem;
          box-shadow: 0 10px 30px rgba(6, 78, 59, 0.3);
          backdrop-filter: blur(12px);
          display: flex;
          gap: 0.75rem;
          align-items: stretch;
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 700ms ease 120ms, transform 700ms ease 120ms;
        }
        @media (min-width: 640px) {
          .hero-membership-glass-card { width: 15rem; }
        }
        .hero-membership-glass-card.revealed {
          opacity: 1;
          transform: translateY(0);
        }
        .membership-left-col {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .membership-big-val {
          font-size: 1.875rem;
          font-weight: 700;
          line-height: 1;
        }
        .membership-sub-lbl {
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.9);
        }
        .membership-doctor-thumb {
          width: 4rem;
          aspect-ratio: 3/4;
          border-radius: 0.75rem;
          object-fit: cover;
        }

        /* 3. Trust Section */
        .trust-sec {
          background: var(--background);
          position: relative;
          isolation: isolate;
          overflow: hidden;
          padding: 4rem 1.5rem;
        }
        @media (min-width: 640px) {
          .trust-sec { padding: 5rem 2.5rem; }
        }

        .trust-badges-flex {
          position: relative;
          z-index: 20;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        @media (min-width: 640px) {
          .trust-badges-flex {
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
          }
        }
        .percent-circle-badge {
          width: 7.5rem;
          height: 7.5rem;
          border-radius: var(--radius-pill);
          background: var(--surface);
          border: 2px solid var(--brand);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0.5rem;
        }
        @media (min-width: 640px) {
          .percent-circle-badge { width: 8.5rem; height: 8.5rem; }
        }
        .percent-circle-badge .val { font-size: 1.75rem; font-weight: 700; color: var(--brand-deep); }
        .percent-circle-badge .lbl { font-size: 0.6rem; color: var(--ink-soft); max-width: 8em; text-transform: uppercase; font-weight: 600; }

        .trust-badge-card {
          max-width: 32rem;
          border-radius: var(--radius-card);
          background: var(--surface);
          border: 1px solid var(--hairline);
          padding: 1.25rem;
          display: flex;
          gap: 1rem;
        }
        @media (min-width: 640px) {
          .trust-badge-card { padding: 1.5rem; gap: 1.25rem; }
        }
        .badge-chip-num {
          border-radius: 0.75rem;
          background: var(--brand-deep);
          color: #ffffff;
          padding: 0.5rem 1rem;
          font-size: 1.25rem;
          font-weight: 700;
          height: fit-content;
        }
        .badge-text-box h3 { font-size: 1.125rem; font-weight: 700; color: var(--ink); margin: 0 0 0.35rem; }
        .badge-text-box p { font-size: 0.75rem; color: var(--ink-soft); line-height: 1.5; margin: 0; }

        /* Ghost Heading Carousel */
        .ghost-giant-heading {
          pointer-events: none;
          position: relative;
          z-index: 0;
          user-select: none;
          max-width: 88rem;
          margin: 3rem auto 0;
          text-align: center;
          font-size: 8vw;
          font-weight: 700;
          text-transform: uppercase;
          line-height: 1.02;
          letter-spacing: -0.02em;
        }
        .ghost-heading-row {
          display: flex;
          justify-content: space-between;
        }
        .ghost-word-item {
          display: inline-block;
          color: var(--ghost);
          transition: transform 700ms ease, opacity 700ms ease;
        }
        .ghost-word-item.ink { color: var(--brand-deep); }

        /* Doctor Card */
        .center-doctor-card-wrap {
          position: relative;
          z-index: 10;
          margin: 2rem auto;
          width: 13rem;
        }
        @media (min-width: 640px) {
          .center-doctor-card-wrap {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            margin: 0;
            width: 16rem;
          }
        }
        .center-doctor-card {
          transform: rotate(6deg);
          aspect-ratio: 3/4;
          border-radius: var(--radius-card);
          background: var(--brand-deep);
          overflow: hidden;
          position: relative;
          box-shadow: 0 20px 40px rgba(6, 78, 59, 0.25);
        }
        .doctor-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: opacity 300ms ease;
        }
        .doctor-glass-caption {
          position: absolute;
          inset-x: 0.75rem;
          bottom: 0.75rem;
          border-radius: 0.75rem;
          background: rgba(6, 78, 59, 0.85);
          color: #ffffff;
          backdrop-filter: blur(8px);
          padding: 0.5rem 0.75rem;
        }
        .doc-name { font-size: 0.875rem; font-weight: 700; }
        .doc-role { font-size: 0.65rem; opacity: 0.9; color: var(--brand-light); }

        .trust-controls-bar {
          position: relative;
          z-index: 20;
          margin-top: 3rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        @media (min-width: 640px) {
          .trust-controls-bar { margin-top: 6rem; }
        }

        /* 4. Programs Section */
        .programs-sec {
          background: var(--surface);
          padding: 6rem 1.5rem;
        }
        @media (min-width: 640px) {
          .programs-sec { padding: 6rem 2.5rem; }
        }
        .programs-sec-title {
          font-size: 3rem;
          font-weight: 700;
          color: var(--ink);
          line-height: 0.95;
          letter-spacing: -0.02em;
          margin-top: 1rem;
        }

        .programs-rows-list {
          margin-top: 3.5rem;
          list-style: none;
          padding: 0;
        }
        .program-item-row {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.75rem 0;
          border-top: 1px solid var(--hairline);
          text-decoration: none;
          color: var(--foreground);
          transition: background 200ms ease;
        }
        .program-item-row:last-child { border-bottom: 1px solid var(--hairline); }
        .program-item-row:hover { background: var(--background); }
        .program-idx-num { width: 2.5rem; font-size: 0.875rem; font-weight: 700; color: var(--brand); }
        .program-text-group { flex: 1; }
        .program-title-name { font-size: 1.5rem; font-weight: 700; color: var(--ink); letter-spacing: -0.01em; }
        @media (min-width: 640px) {
          .program-title-name { font-size: 1.875rem; }
        }
        .program-desc-text { font-size: 0.875rem; color: var(--ink-soft); margin-top: 0.25rem; }
        .program-arrow-circle {
          width: 2.75rem;
          height: 2.75rem;
          border-radius: var(--radius-pill);
          border: 1px solid var(--brand);
          color: var(--brand);
          display: grid;
          place-items: center;
        }
        .program-arrow-circle svg {
          width: 1.25rem;
          height: 1.25rem;
          transition: transform 250ms ease;
        }
        .program-item-row:hover .program-arrow-circle svg {
          transform: translateX(8px);
        }

        /* 5. Requirements & Notice Section */
        .requirements-sec {
          background: #ffffff;
          border-radius: var(--radius-card-lg);
          margin-top: -2.5rem;
          padding: 4rem 1.5rem 5rem;
          position: relative;
          z-index: 10;
          border: 1px solid var(--hairline);
        }
        @media (min-width: 640px) {
          .requirements-sec { padding: 4rem 2.5rem 5rem; }
        }

        .req-grid-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2.5rem;
          align-items: start;
        }
        @media (min-width: 768px) {
          .req-grid-layout { grid-template-columns: 1fr 1fr; }
        }

        .req-card-box {
          border-radius: var(--radius-card);
          background: var(--surface);
          border: 1px solid var(--hairline);
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .req-card-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--brand-deep);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .req-bullet-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          font-size: 0.95rem;
          color: var(--ink);
          line-height: 1.4;
        }
        .req-bullet-icon {
          width: 1.5rem;
          height: 1.5rem;
          border-radius: var(--radius-pill);
          background: var(--brand);
          color: #ffffff;
          display: grid;
          place-items: center;
          font-size: 0.75rem;
          font-weight: 700;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        /* 6. Stats Section */
        .stats-sec {
          background: var(--brand-deep);
          color: #ffffff;
          border-radius: var(--radius-card-lg);
          margin-top: 0.75rem;
          padding: 5rem 1.5rem;
        }
        @media (min-width: 640px) {
          .stats-sec { padding: 5rem 2.5rem; }
        }
        .stats-sec-title { font-size: 3rem; font-weight: 700; margin-top: 1rem; }

        .stats-cells-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2rem 3rem;
          margin-top: 4rem;
        }
        @media (min-width: 1024px) {
          .stats-cells-grid { grid-template-columns: repeat(4, 1fr); }
        }

        .stat-item-cell {
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          padding-top: 1.25rem;
        }
        .stat-big-val {
          font-size: 3.75rem;
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.02em;
          color: var(--brand-light);
        }
        @media (min-width: 640px) {
          .stat-big-val { font-size: 4.5rem; }
        }
        .stat-sub-lbl {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.8);
          margin-top: 0.75rem;
        }

        /* 7. Footer */
        .footer-sec {
          background: var(--brand-deep);
          color: #ffffff;
          border-radius: var(--radius-card-lg);
          margin-top: 0.75rem;
          padding: 3.5rem 1.5rem;
        }
        @media (min-width: 640px) {
          .footer-sec { padding: 4rem 2.5rem; }
        }

        .footer-cta-row {
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
          padding-bottom: 3.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        @media (min-width: 640px) {
          .footer-cta-row {
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-end;
          }
        }
        .footer-cta-big-title {
          font-size: 3.5rem;
          font-weight: 700;
          line-height: 0.92;
          letter-spacing: -0.02em;
          margin-top: 1rem;
        }

        .footer-four-cols {
          padding: 3.5rem 0;
          display: grid;
          grid-template-columns: 1fr;
          gap: 2.5rem;
        }
        @media (min-width: 768px) {
          .footer-four-cols { grid-template-columns: 1.4fr 1fr 1fr 1fr; }
        }

        .footer-brand-summary { max-width: 22rem; }
        .f-logo {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .f-blurb { font-size: 0.875rem; color: rgba(255, 255, 255, 0.75); margin-top: 1rem; line-height: 1.5; }
        .f-address {
          font-style: normal;
          margin-top: 1.5rem;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.9);
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .f-address a:hover { text-decoration: underline; color: #ffffff; }

        .f-col-nav h4 {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: var(--brand-light);
          margin-bottom: 1rem;
        }
        .f-col-nav ul {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.85);
        }
        .f-col-nav a { color: inherit; text-decoration: none; }
        .f-col-nav a:hover { color: #ffffff; }

        .footer-bottom-copyright {
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          padding-top: 2rem;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        @media (min-width: 640px) {
          .footer-bottom-copyright {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }

        /* Modal Overlay */
        .modal-overlay-bg {
          position: fixed;
          inset: 0;
          z-index: 90;
          background: rgba(6, 78, 59, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 0.75rem;
          opacity: 0;
          pointer-events: none;
          transition: opacity 300ms ease;
        }
        @media (min-width: 640px) {
          .modal-overlay-bg { align-items: center; padding: 1.5rem; }
        }
        .modal-overlay-bg.open {
          opacity: 1;
          pointer-events: auto;
        }

        .modal-dialog-panel {
          width: 100%;
          max-width: 32rem;
          max-height: 92vh;
          overflow-y: auto;
          border-radius: var(--radius-card-lg);
          background: var(--surface-card);
          padding: 1.5rem;
          color: var(--ink);
          box-shadow: 0 25px 50px rgba(6, 78, 59, 0.4);
          transform: translateY(28px) scale(0.96);
          transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (min-width: 640px) {
          .modal-dialog-panel { padding: 2rem; }
        }
        .modal-overlay-bg.open .modal-dialog-panel {
          transform: translateY(0) scale(1);
        }

        .modal-close-icon-btn {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: var(--radius-pill);
          background: var(--surface);
          display: grid;
          place-items: center;
          border: none;
          cursor: pointer;
          transition: background 200ms ease;
        }
        .modal-close-icon-btn:hover { background: var(--hairline); }

        /* Fullscreen Menu Overlay */
        .fullscreen-menu-overlay {
          position: fixed;
          inset: 0;
          z-index: 70;
          background: var(--brand-deep);
          color: #ffffff;
          display: flex;
          flex-direction: column;
          opacity: 0;
          pointer-events: none;
          transition: opacity 300ms ease;
          padding: 0.5rem;
        }
        @media (min-width: 640px) {
          .fullscreen-menu-overlay { padding: 0.75rem; }
        }
        .fullscreen-menu-overlay.open {
          opacity: 1;
          pointer-events: auto;
        }

        .menu-inner-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
        }
        @media (min-width: 640px) {
          .menu-inner-container { padding: 2.5rem; }
        }
      `}</style>

      {/* Opening Loader Curtain */}
      <div className={`loader-curtain ${!isLoaderVisible ? 'hidden-curtain' : ''}`}>
        <div className={`loader-brand ${isLoaderFilled ? 'visible' : ''}`}>
          <div className="loader-seals-trio">
            <div className="loader-seal-item">
              <img src="/assets/logo_doh.jpg" alt="Department of Health DOH Seal" className="loader-logo-seal" />
              <span className="loader-seal-label">DOH</span>
            </div>
            <div className="loader-seal-item main-seal">
              <img src="/assets/logo_mho_tagoloan.jpg" alt="Tagoloan Municipal Health Office Seal" className="loader-logo-seal" />
              <span className="loader-seal-label">TAGOLOAN MHO</span>
            </div>
            <div className="loader-seal-item">
              <img src="/assets/logo_rhu.jpg" alt="Rural Health Unit RHU Seal" className="loader-logo-seal" />
              <span className="loader-seal-label">RHU</span>
            </div>
          </div>
          <span className="loader-brand-title">RURAL HEALTH UNIT OF TAGOLOAN</span>
          <span className="loader-brand-sub">ANIMAL BITE TREATMENT CENTER</span>
        </div>
        <div className="loader-progress-track">
          <div className={`loader-progress-fill ${isLoaderFilled ? 'filled' : ''}`}></div>
        </div>
      </div>

      {/* Top Official Seals Header Bar (Flush Full-Width Edge-to-Edge with Exact Logos Kept) */}
      <div className={`seals-bar ${!isLoaderVisible ? 'page-entered' : ''}`}>
        <div className="seal-emblem seal-1">
          <img src="/assets/logo_doh.jpg" alt="Department of Health DOH Seal" className="seal-badge-icon" />
          <span>Department of Health</span>
        </div>
        <div className="seal-emblem seal-2">
          <img src="/assets/logo_mho_tagoloan.jpg" alt="Municipal Health Office Tagoloan Misamis Oriental Seal" className="seal-badge-icon" />
          <span>Tagoloan, Misamis Oriental</span>
        </div>
        <div className="seal-emblem seal-3">
          <img src="/assets/logo_rhu.jpg" alt="Rural Health Unit RHU Seal" className="seal-badge-icon" />
          <span>Rural Health Unit</span>
        </div>
      </div>

      <main className="baseline-main">
        {/* 1. Hero Section */}
        <section className="hero-sec" id="hero">
          <div className="hero-wave-arc"></div>
          <div className="hero-parallax-wrapper" ref={heroBgRef}>
            <img src={heroMedicalBg} alt="RHU Tagoloan Animal Bite Treatment Center" />
          </div>
          <div className="hero-gradient-mask"></div>

          {/* Site Header */}
          <header className="hero-header">
            <nav className="header-left-nav">
              <a href="#schedule">Schedule & Hours</a>
              <a href="#programs">Care Programs</a>
              <a href="#requirements">Requirements</a>
            </nav>

            <div className="header-brand-logo">
              <span className="h-subtext">RURAL HEALTH UNIT OF TAGOLOAN</span>
              <span className="h-titletext">ANIMAL BITE TREATMENT CENTER</span>
            </div>

            <div className="header-right-nav">
              <button className="header-signin-btn" onClick={handleSignIn}>
                Staff Sign In
              </button>
              <button className="burger-trigger-btn" onClick={() => setIsMenuOpen(true)} aria-label="Open menu">
                <div className="burger-bar-line"></div>
                <div className="burger-bar-line"></div>
              </button>
            </div>
          </header>

          {/* Headline Title */}
          <div className="hero-headline-block">
            <div className="rhu-banner-header">Poblacion, Tagoloan, Misamis Oriental</div>
          </div>

          {/* Bottom Grid */}
          <div className="hero-bottom-grid">
            <div className="hero-sub-tagline">
              <p>
                PROMPT PEP CARE.<br />SAVING LIVES IN TAGOLOAN, MISAMIS ORIENTAL.
              </p>
            </div>

            <div className="hero-cards-cluster">
              {/* Slider Card */}
              <div className={`hero-slider-glass-card ${isHeroRevealed ? 'revealed' : ''}`}>
                <div className="slider-glass-inner">
                  <img src={activeSlide.img} alt={activeSlide.title} className="slider-thumb-img" />
                  <div className="slider-text-group">
                    <span className="slider-brand-lbl">{activeSlide.brand}</span>
                    <span className="slider-title-lbl">{activeSlide.title}</span>
                    <a href="#programs" className="slider-cta-link">{activeSlide.cta}</a>
                  </div>
                </div>
              </div>

              {/* Membership Card */}
              <div className={`hero-membership-glass-card ${isHeroRevealed ? 'revealed' : ''}`}>
                <div className="membership-left-col">
                  <div>
                    <div className="membership-big-val">12K+</div>
                  </div>
                  <div className="membership-sub-lbl">Tagoloan Residents Protected</div>
                </div>
                <img src={headDoctorPortraitImg} alt="RHU Medical Doctor" className="membership-doctor-thumb" />
              </div>
            </div>
          </div>
        </section>

        {/* Featured Schedule Highlight Card (Moved Down below Hero Photo) */}
        <div className="schedule-highlight-banner" id="schedule">
          <div className="sched-left-info">
            <div className="sched-badge-icon">🗓️</div>
            <div>
              <div className="sched-days-title">SCHEDULE: MONDAYS & THURSDAYS</div>
              <div className="sched-hours-sub">Operating Hours: <strong>8:00 AM – 5:00 PM</strong></div>
            </div>
          </div>

          <div className="sched-notices-list">
            <div className="notice-tag urgent">
              ⏰ Registration Window: <strong>8:00 AM – 10:00 AM (Come Early!)</strong>
            </div>
            <div className="notice-tag">
              ⚡ First Come, First Served Basis
            </div>
            <div className="notice-tag">
              📋 Requirement: <strong>Please bring updated PhilHealth MDR</strong>
            </div>
          </div>
        </div>

        {/* 3. Trust Section */}
        <section className="trust-sec" id="trust">
          <div className="trust-badges-flex">
            <div className="percent-circle-badge inview-el">
              <span className="val">100%</span>
              <span className="lbl">DOH & WHO Certified PEP Center</span>
            </div>

            <div className="trust-badge-card inview-el">
              <div className="badge-chip-num">RHU</div>
              <div className="badge-text-box">
                <h3>Rural Health Unit of Tagoloan</h3>
                <p>Providing free & subsidized anti-rabies post-exposure prophylaxis vaccinations for the community of Tagoloan, Misamis Oriental and surrounding barangays.</p>
              </div>
            </div>
          </div>

          {/* Ghost Words Carousel */}
          <h2 className="ghost-giant-heading">
            <div className="ghost-heading-row">
              <span className="ghost-word-item">{activeTrust.words[0]}</span>
              <span className="ghost-word-item">{activeTrust.words[1]}</span>
            </div>
            <div className="ghost-heading-row">
              <span className="ghost-word-item ink">{activeTrust.words[2]}</span>
              <span className="ghost-word-item">{activeTrust.words[3]}</span>
            </div>
          </h2>

          {/* Doctor Card */}
          <div className="center-doctor-card-wrap">
            <div className="center-doctor-card inview-el">
              <img src={activeTrust.img} alt={activeTrust.name} className="doctor-card-img" />
              <div className="doctor-glass-caption">
                <div className="doc-name">{activeTrust.name}</div>
                <div className="doc-role">{activeTrust.role}</div>
              </div>
            </div>
          </div>

          {/* Trust Controls */}
          <div className="trust-controls-bar">
            <button
              className="btn-arrow-comp outline"
              onClick={() => setTrustIdx((prev) => (prev - 1 + TRUST_SLIDES.length) % TRUST_SLIDES.length)}
              aria-label="Previous slide"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ transform: 'scaleX(-1)' }}>
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </button>

            <button
              className="btn-arrow-comp solid"
              onClick={() => setTrustIdx((prev) => (prev + 1) % TRUST_SLIDES.length)}
              aria-label="Next slide"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </button>
          </div>
        </section>

        {/* 4. Programs Section */}
        <section className="programs-sec" id="programs">
          <div className="eyebrow-comp tone-dark">
            <div className="dot"></div>
            <span>RHU Tagoloan Care Programs</span>
          </div>

          <h2 className="programs-sec-title">
            Complete Rabies<br />Treatment Services
          </h2>

          <ul className="programs-rows-list">
            {[
              { idx: "01", name: "Post-Exposure Prophylaxis (PEP)", desc: "4-dose anti-rabies vaccine protocol following standard WHO & DOH guidelines." },
              { idx: "02", name: "Emergency Wound Triage & Cleaning", desc: "Immediate 15-minute surgical soap-and-water wound washing and antiseptics." },
              { idx: "03", name: "Tetanus Immunization", desc: "Tetanus toxoid / Tetanus immunoglobulin administration for severe animal bites." },
              { idx: "04", name: "PhilHealth Benefit Processing", desc: "Direct filing for PhilHealth Animal Bite Treatment Package coverage." }
            ].map((p, index) => (
              <li key={p.idx}>
                <a
                  href="#contact"
                  className="program-item-row inview-el"
                  onClick={(e) => { e.preventDefault(); setIsModalOpen(true); }}
                  style={{ transitionDelay: `${index * 90}ms` }}
                >
                  <span className="program-idx-num">{p.idx}</span>
                  <div className="program-text-group">
                    <div className="program-title-name">{p.name}</div>
                    <div className="program-desc-text">{p.desc}</div>
                  </div>
                  <div className="program-arrow-circle">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M5 12h14M13 6l6 6-6 6"/>
                    </svg>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* 5. Requirements & Operating Rules Section */}
        <section className="requirements-sec" id="requirements">
          <div className="eyebrow-comp tone-dark">
            <div className="dot"></div>
            <span>Important Clinic Guidelines & Official Poster</span>
          </div>

          <h2 className="programs-sec-title" style={{ marginBottom: '2rem' }}>
            What to Bring & Official Schedule Notice
          </h2>

          <div className="req-grid-layout">
            <div className="req-card-box">
              <div className="req-card-title">
                <span>📋 Mandatory Requirements</span>
              </div>
              <div className="req-bullet-item">
                <div className="req-bullet-icon">1</div>
                <div><strong>Updated PhilHealth MDR</strong> (Member Data Record) — Required for vaccine coverage.</div>
              </div>
              <div className="req-bullet-item">
                <div className="req-bullet-icon">2</div>
                <div><strong>Valid Government-Issued ID</strong> or Student ID for verification.</div>
              </div>
              <div className="req-bullet-item">
                <div className="req-bullet-icon">3</div>
                <div><strong>Vaccination Card</strong> (If returning for follow-up doses: Day 3, Day 7, Day 14, Day 28).</div>
              </div>
            </div>

            <div className="req-card-box">
              <div className="req-card-title">
                <span>⏰ Registration Rules</span>
              </div>
              <div className="req-bullet-item">
                <div className="req-bullet-icon">⚡</div>
                <div><strong>Registration Window: 8:00 AM – 10:00 AM ONLY</strong>. Please arrive early!</div>
              </div>
              <div className="req-bullet-item">
                <div className="req-bullet-icon">👥</div>
                <div><strong>First Come, First Served Basis</strong> — Daily queue numbers are issued upon arrival.</div>
              </div>
              <div className="req-bullet-item">
                <div className="req-bullet-icon">📅</div>
                <div><strong>Clinic Days</strong> — Mondays and Thursdays (8:00 AM – 5:00 PM).</div>
              </div>
            </div>
          </div>
        </section>

        {/* 5.5 Health Advisory (MPOX) Section */}
        <section className="requirements-sec" id="advisory" style={{ background: '#f0fdf4', border: '2px solid var(--brand)', marginTop: '1.5rem' }}>
          <div className="eyebrow-comp tone-dark">
            <div className="dot"></div>
            <span>DOH & RHU Tagoloan Public Health Notice</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', marginBottom: '2rem' }}>
            <h2 className="programs-sec-title" style={{ margin: 0, color: 'var(--brand-deep)', fontSize: '2.5rem' }}>
              HEALTH ADVISORY
            </h2>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PAHIMAGNO BATOK SA MONKEYPOX (MPOX)
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))', gap: '1.25rem' }}>
            <div className="req-card-box" style={{ background: '#ffffff', padding: '1.5rem' }}>
              <div className="req-card-title" style={{ fontSize: '1.1rem', color: 'var(--brand-deep)' }}>
                <span>1. UNSA ANG MONKEYPOX?</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
                Ang monkeypox usa ka sakit nga hinungdan sa monkeypox virus. Kini makaapekto sa tanang tawo ug mahimong makatakod gikan sa usa ka tawo ngadto sa lain.
              </p>
            </div>

            <div className="req-card-box" style={{ background: '#ffffff', padding: '1.5rem' }}>
              <div className="req-card-title" style={{ fontSize: '1.1rem', color: 'var(--brand-deep)' }}>
                <span>2. UNSAON PAGKATAKOD?</span>
              </div>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.85rem', color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>Diretso nga kontak sa panit nga adunay rashes o samad.</li>
                <li>Pag-ambit sa personal nga gamit (habol, sinina, o kutsara).</li>
                <li>Pag-uban sa lugar nga siksik ug walay husto nga bentilasyon.</li>
              </ul>
            </div>

            <div className="req-card-box" style={{ background: '#ffffff', padding: '1.5rem' }}>
              <div className="req-card-title" style={{ fontSize: '1.1rem', color: 'var(--brand-deep)' }}>
                <span>3. SINTOMAS SA MONKEYPOX</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                <div>• Hilanat</div>
                <div>• Ubo</div>
                <div>• Panakit sa kalawasan</div>
                <div>• Rashes sa nawong/lawas</div>
                <div>• Pananakit sa ulo</div>
              </div>
            </div>

            <div className="req-card-box" style={{ background: '#ffffff', padding: '1.5rem' }}>
              <div className="req-card-title" style={{ fontSize: '1.1rem', color: 'var(--brand-deep)' }}>
                <span>4. PAGLIKAY UG PROTEKSYON</span>
              </div>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.85rem', color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>Likayi ang diretso nga kontak sa tawo nga adunay rashes o samad.</li>
                <li>Kanunay paghugas sa kamot gamit ang sabon ug tubig.</li>
                <li>Gamit og face mask ug disinfectant o sanitizer.</li>
                <li>Palayo sa hayop nga posibleng adunay virus.</li>
              </ul>
            </div>

            <div className="req-card-box" style={{ background: '#ffffff', padding: '1.5rem', gridColumn: '1 / -1' }}>
              <div className="req-card-title" style={{ fontSize: '1.1rem', color: 'var(--brand-deep)' }}>
                <span>5. KUNG MAKASINATI UG SINTOMAS</span>
              </div>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.85rem', color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li><strong>Ayaw pagpanik.</strong></li>
                <li>Kontaka dayon ang Rural Health Unit (RHU Tagoloan) o pinakaduol nga doctor.</li>
                <li>Likayi ang pagpakig-uban sa ubang tawo samtang walay klarong diagnosis.</li>
              </ul>
            </div>
          </div>

          {/* Bottom Banner Callout */}
          <div style={{ marginTop: '2rem', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-card)', background: 'var(--brand-deep)', color: '#ffffff', textAlign: 'center', fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.5 }}>
            Magtinabangay ta sa pagpugong sa pagkatap sa monkeypox! Siguradoha nga updated ka sa impormasyon gikan sa DOH ug mga lokal nga awtoridad.
          </div>
        </section>

        {/* 6. Stats Section */}
        <section className="stats-sec" id="stats">
          <div className="eyebrow-comp tone-light">
            <div className="dot"></div>
            <span>RHU Tagoloan Track Record</span>
          </div>

          <h2 className="stats-sec-title">
            Serving Tagoloan, Misamis Oriental<br />With Excellence
          </h2>

          <div className="stats-cells-grid">
            {[
              { val: "Mon & Thu", lbl: "Regular Clinic Days" },
              { val: "8am-10am", lbl: "Registration Cutoff Window" },
              { val: "100%",      lbl: "PhilHealth Package Coverage" },
              { val: "Tagoloan",  lbl: "Rural Health Office" }
            ].map((s, idx) => (
              <div key={idx} className="stat-item-cell inview-el" style={{ transitionDelay: `${idx * 110}ms` }}>
                <div className="stat-big-val">{s.val}</div>
                <div className="stat-sub-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 7. Footer */}
        <footer className="footer-sec" id="contact">
          <div className="footer-cta-row">
            <div>
              <div className="eyebrow-comp tone-light">
                <div className="dot"></div>
                <span>Rural Health Unit of Tagoloan</span>
              </div>
              <h2 className="footer-cta-big-title">
                Need Bite Care?<br />Come Early on Clinic Days.
              </h2>
            </div>
            <button className="btn-pill-comp btn-pill-light" onClick={() => setIsModalOpen(true)}>
              <span>Book / Inquiry</span>
            </button>
          </div>

          <div className="footer-four-cols">
            <div className="footer-brand-summary">
              <div className="f-logo">
                <span className="h-subtext">RURAL HEALTH UNIT OF TAGOLOAN</span>
                <span className="h-titletext" style={{ fontSize: '0.9rem' }}>ANIMAL BITE TREATMENT CENTER</span>
              </div>
              <p className="f-blurb">
                Official Municipal Health Center providing anti-rabies post-exposure vaccinations for the community.
              </p>
              <address className="f-address">
                <span>📍 Poblacion, Tagoloan, Misamis Oriental</span>
                <span>⏰ Mondays & Thursdays (8:00 AM – 5:00 PM)</span>
                <span>⏱️ Registration: 8:00 AM – 10:00 AM</span>
              </address>
            </div>

            <div className="f-col-nav">
              <h4>Clinic Info</h4>
              <ul>
                <li><a href="#schedule">Operating Schedule</a></li>
                <li><a href="#requirements">What to Bring</a></li>
                <li><a href="#programs">Services Offered</a></li>
                <li><a href="#requirements">PhilHealth Guidelines</a></li>
              </ul>
            </div>

            <div className="f-col-nav">
              <h4>Health Office</h4>
              <ul>
                <li><a href="#trust">DOH Accreditation</a></li>
                <li><a href="#trust">Municipal Health Office</a></li>
                <li><a href="#stats">Coverage Statistics</a></li>
              </ul>
            </div>

            <div className="f-col-nav">
              <h4>Staff Portal</h4>
              <ul>
                <li><button style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', padding: 0 }} onClick={handleSignIn}>Staff Sign In →</button></li>
                <li><a href="#contact">Clinic Information</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom-copyright">
            <div>© 2026 Rural Health Unit of Tagoloan, Misamis Oriental. All rights reserved.</div>
          </div>
        </footer>
      </main>

      {/* Booking / Contact Modal Dialog */}
      <div className={`modal-overlay-bg ${isModalOpen ? 'open' : ''}`} aria-hidden={!isModalOpen}>
        <div className="modal-dialog-panel" role="dialog" aria-modal="true">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="eyebrow-comp tone-dark">
                <div className="dot"></div>
                <span>RHU Tagoloan Inquiry</span>
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem', lineHeight: 1.1, margin: '0.5rem 0 0', color: 'var(--brand-deep)' }}>
                Animal Bite Care<br />Inquiry / Pre-Register
              </h2>
            </div>
            <button className="modal-close-icon-btn" onClick={handleCloseModal} aria-label="Close modal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 6l12 12M18 6L6 18"/>
              </svg>
            </button>
          </div>

          {!isSuccess ? (
            <form className="modal-inputs-form" onSubmit={handleFormSubmit}>
              <div className="form-field-item">
                <label htmlFor="fname">Full Name</label>
                <input
                  type="text"
                  id="fname"
                  required
                  value={fname}
                  onChange={(e) => setFname(e.target.value)}
                  placeholder="Juan Dela Cruz"
                />
              </div>
              <div className="form-field-item">
                <label htmlFor="femail">Contact Number or Email</label>
                <input
                  type="text"
                  id="femail"
                  required
                  value={femail}
                  onChange={(e) => setFemail(e.target.value)}
                  placeholder="0912 345 6789 or email@domain.com"
                />
              </div>
              <div className="form-field-item">
                <label htmlFor="fdesc">Bite Incident / Inquiry Details</label>
                <textarea
                  id="fdesc"
                  rows={3}
                  value={fdesc}
                  onChange={(e) => setFdesc(e.target.value)}
                  placeholder="Dog bite on left leg, washed with soap, asking about Monday registration..."
                />
              </div>
              <button type="submit" className="btn-pill-comp btn-pill-solid" style={{ marginTop: '0.5rem', background: 'var(--brand-deep)' }} disabled={isSubmitting}>
                <span>{isSubmitting ? 'Submitting…' : 'Submit Inquiry'}</span>
              </button>
            </form>
          ) : (
            <div className="success-box-wrapper">
              <div className="success-circle-icon" style={{ background: 'var(--brand-deep)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-deep)' }}>Inquiry Received</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', margin: 0 }}>
                Thank you <strong>{fname || 'Patient'}</strong>. Please remember to arrive between <strong>8:00 AM – 10:00 AM on Mondays or Thursdays</strong> at Tagoloan, Misamis Oriental with your <strong>PhilHealth MDR</strong>.
              </p>
              <button className="btn-pill-comp btn-pill-solid" onClick={handleCloseModal} style={{ marginTop: '0.5rem', background: 'var(--brand-deep)' }}>
                <span>Understood</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Menu Overlay */}
      <div className={`fullscreen-menu-overlay ${isMenuOpen ? 'open' : ''}`}>
        <div className="menu-inner-container">
          <div className="menu-top-header">
            <div className="f-logo">
              <span className="h-subtext">RURAL HEALTH UNIT OF TAGOLOAN</span>
              <span className="h-titletext" style={{ fontSize: '0.9rem' }}>ANIMAL BITE TREATMENT CENTER</span>
            </div>
            <button className="modal-close-icon-btn" onClick={() => setIsMenuOpen(false)} aria-label="Close menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 6l12 12M18 6L6 18"/>
              </svg>
            </button>
          </div>

          <nav className="menu-center-links-group">
            <a href="#schedule" className="menu-item-anchor" onClick={() => setIsMenuOpen(false)}>Schedule</a>
            <a href="#programs" className="menu-item-anchor" onClick={() => setIsMenuOpen(false)}>Programs</a>
            <a href="#requirements" className="menu-item-anchor" onClick={() => setIsMenuOpen(false)}>Requirements</a>
            <a href="#trust" className="menu-item-anchor" onClick={() => setIsMenuOpen(false)}>About RHU</a>
          </nav>

          <div className="menu-bottom-footer">
            <button className="btn-pill-comp btn-pill-light" onClick={() => { setIsMenuOpen(false); setIsModalOpen(true); }}>
              <span>Inquiry / Pre-Register</span>
            </button>
            <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>
              Poblacion, Tagoloan, Misamis Oriental
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
