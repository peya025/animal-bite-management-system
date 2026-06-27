import { useState, useEffect, useRef } from 'react';
import { APP_NAME, APP_SHORT_NAME } from '../constants';
import '../styles/LandingPage.css';
import antiviralVaccineImg from '../assets/image.png';
import rorOrModified from '../assets/roror-modified.png';



export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [clinicName, setClinicName] = useState('Animal Bite Treatment Center');
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clinicData = localStorage.getItem('clinicData');
    if (clinicData) {
      try {
        const clinic = JSON.parse(clinicData);
        if (clinic.name) {
          setClinicName(clinic.name);
        }
      } catch (e) {
        console.error('Failed to parse clinic data:', e);
      }
    }
  }, []);

  const handleSignIn = () => {
    window.location.href = '/login';
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
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span>{APP_SHORT_NAME}</span>
          </div>
          
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

          <ul className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
            <li><a href="#about">About</a></li>
            <li><a href="#help">Help Center</a></li>
            <li><a href="#contact">Contact Support</a></li>
            <li><button onClick={handleSignIn} className="nav-btn signin-btn">Staff Sign In</button></li>
          </ul>
        </div>
      </nav>

      <main>
        <section className="hero-landing">
          <div className="hero-badge">Welcome to Your Healthcare Portal</div>

          <div className="hero-main">
            <h1>{clinicName}</h1>
            <p className="hero-sub">
              Animal Bite Treatment Center Management System. 
              Providing efficient, WHO-compliant care for animal bite incidents 
              with streamlined patient management and vaccination tracking.
            </p>

            <div className="hero-cta">
              <button onClick={handleSignIn} className="btn btn-pill btn-pill-primary">
                Staff Login →
              </button>
              <a href="#help" className="btn btn-pill btn-pill-light">Need Help?</a>
            </div>
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
              <div className="help-icon">📖</div>
              <h3>User Guides</h3>
              <p>Step-by-step instructions for each role</p>
              <a href="#contact" className="help-link">Learn more →</a>
            </div>

            <div className="help-card">
              <div className="help-icon">🎥</div>
              <h3>Video Tutorials</h3>
              <p>Watch demonstration videos</p>
              <a href="#contact" className="help-link">Watch now →</a>
            </div>

            <div className="help-card">
              <div className="help-icon">❓</div>
              <h3>FAQs</h3>
              <p>Common questions and answers</p>
              <a href="#contact" className="help-link">View FAQs →</a>
            </div>

            <div className="help-card">
              <div className="help-icon">🛠️</div>
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
            <h4>{APP_SHORT_NAME}</h4>
            <p>Animal Bite Management & Monitoring System</p>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.5rem' }}>
              Developed for {clinicName}
            </p>
          </div>

          <div className="footer-section">
            <h5>Quick Links</h5>
            <ul>
              <li><a href="#about">About System</a></li>
              <li><a href="#help">Help Center</a></li>
              <li><button onClick={handleSignIn}>Staff Login</button></li>
            </ul>
          </div>

          <div className="footer-section">
            <h5>Support</h5>
            <ul>
              <li><a href="#contact">Contact Support</a></li>
              <li><a href="#help">User Guides</a></li>
              <li><a href="#help">FAQs</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h5>System Info</h5>
            <ul>
              <li><a href="#about">Features</a></li>
              <li><a href="#about">Security</a></li>
              <li><a href="#contact">Report Issue</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 {APP_NAME}. Powered by ABMMS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}