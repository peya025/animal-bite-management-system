import { useState } from 'react';
import { APP_NAME, APP_SHORT_NAME } from '../constants';
import '../styles/LandingPage.css';
import antiviralVaccineImg from '../assets/image.png';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignIn = () => {
    // Always go to login page - it will handle redirect if already authenticated
    window.location.href = '/login';
  };

  const handleGetStarted = () => {
    // Always go to login page - it will handle redirect if already authenticated
    window.location.href = '/login';
  };

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <ul className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#contact">Contact</a></li>
            <li><button onClick={handleSignIn} className="nav-btn signin-btn">Sign In</button></li>
          </ul>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-landing">
        <div className="hero-badge">Healthcare Management Platform</div>

        <div className="hero-main">
          <h1>{APP_NAME}</h1>
          <p className="hero-sub">
            A comprehensive platform for managing Animal Bite Treatment Centers. 
            Streamline operations, improve patient care, and ensure WHO protocol compliance 
            with our all-in-one solution.
          </p>

          <div className="hero-cta">
            <button onClick={handleGetStarted} className="btn btn-pill btn-pill-primary">
              Access Platform →
            </button>
            <a href="#features" className="btn btn-pill btn-pill-light">Explore Features</a>
          </div>
        </div>

        <div className="hero-metrics">
          <div className="metric">
            <div className="metric-icon">❤️</div>
            <div className="metric-number">2,500+</div>
            <div className="metric-label">Patients Treated</div>
          </div>

          <div className="metric">
            <div className="metric-icon">🏥</div>
            <div className="metric-number">1</div>
            <div className="metric-label">Clinic Deployment</div>
          </div>

          <div className="metric">
            <div className="metric-icon">👤</div>
            <div className="metric-number">4</div>
            <div className="metric-label">User Roles</div>
          </div>

          <div className="metric">
            <div className="metric-icon">📈</div>
            <div className="metric-number">99.9%</div>
            <div className="metric-label">System Uptime</div>
          </div>
        </div>
      </section>

      {/* Features Banner + Grid */}
      <section className="features-hero">
        <div className="features-hero-banner">
          <img 
            src={antiviralVaccineImg} 
            alt="Anti-rabies Vaccination - Animal bite prevention and treatment" 
          />
        </div>

        <div id="features" className="section-header">
          <h2>Everything You Need</h2>
          <p>Powerful features designed specifically for animal bite treatment center management</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🩺</div>
            <h3>WHO Protocol Compliance</h3>
            <p>Automated 5-dose vaccination schedule following WHO rabies PEP guidelines</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Patient Management</h3>
            <p>Complete patient registry with auto-generated patient numbers and records</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <h3>Smart Scheduling</h3>
            <p>Automatic vaccination schedule generation on Day 0, 3, 7, 14, and 28</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📋</div>
            <h3>Queue Management</h3>
            <p>Real-time patient queue with priority management and status tracking</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Role-Based Access</h3>
            <p>4 user roles: Admin, Registration, Triage, and Treatment staff</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⏱️</div>
            <h3>Real-Time Tracking</h3>
            <p>Live bite case monitoring and vaccination administration tracking</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works">
        <div className="section-header">
          <h2>How It Works</h2>
          <p>Simple, efficient workflow for animal bite incident management</p>
        </div>

        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Register Patient</h3>
            <p>Registration staff quickly registers patients with auto-generated patient numbers</p>
          </div>

          <div className="step-arrow">→</div>

          <div className="step">
            <div className="step-number">2</div>
            <h3>Assess & Document</h3>
            <p>Triage staff creates bite case with WHO category assessment and animal details</p>
          </div>

          <div className="step-arrow">→</div>

          <div className="step">
            <div className="step-number">3</div>
            <h3>Auto Schedule</h3>
            <p>System automatically generates 5-dose vaccination schedule based on WHO protocol</p>
          </div>

          <div className="step-arrow">→</div>

          <div className="step">
            <div className="step-number">4</div>
            <h3>Track Treatment</h3>
            <p>Treatment staff records vaccinations and monitors patient progress</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Transform Your Animal Bite Management?</h2>
          <p>Join healthcare facilities improving patient care with streamlined workflows</p>
          <button onClick={handleGetStarted} className="btn btn-primary btn-large">
            Get Started Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>{APP_SHORT_NAME}</h4>
            <p>Animal Bite Management & Monitoring System</p>
            <div className="social-links">
              <a href="#" aria-label="Facebook">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a href="#" aria-label="Twitter">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                </svg>
              </a>
              <a href="#" aria-label="LinkedIn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </div>
          </div>

          <div className="footer-section">
            <h5>Product</h5>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><button onClick={handleSignIn}>Sign In</button></li>
            </ul>
          </div>

          <div className="footer-section">
            <h5>Resources</h5>
            <ul>
              <li><a href="#about">About</a></li>
              <li><a href="#help">Help Center</a></li>
              <li><a href="#contact">Contact Us</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h5>Legal</h5>
            <ul>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms of Service</a></li>
              <li><a href="#security">Security</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 {APP_NAME}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}