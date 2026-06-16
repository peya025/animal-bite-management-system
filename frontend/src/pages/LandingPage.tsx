import { useState } from 'react';
import '../styles/LandingPage.css';
import antiviralVaccineImg from '../assets/image.png';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span>Tagoloan ABTC</span>
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
            <li><a href="/login" className="nav-btn signin-btn">Sign In</a></li>
          </ul>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-landing">
        <div className="hero-badge">Healthcare Management Platform</div>

        <div className="hero-main">
          <h1>Animal Bite Center Management System</h1>
          <p className="hero-sub">A comprehensive platform for managing Animal Bite Centers. Streamline operations, improve patient care, and ensure compliance with our all-in-one solution.</p>

          <div className="hero-cta">
            <a href="/login" className="btn btn-pill btn-pill-primary">Access Platform →</a>
            <a href="#features" className="btn btn-pill btn-pill-light">Explore Features</a>
          </div>
        </div>

        <div className="hero-metrics">
          <div className="metric">
            <div className="metric-icon">❤</div>
            <div className="metric-number">10,000+</div>
            <div className="metric-label">Patients Treated</div>
          </div>

          <div className="metric">
            <div className="metric-icon">🏥</div>
            <div className="metric-number">50+</div>
            <div className="metric-label">Clinic Nationwide</div>
          </div>

          <div className="metric">
            <div className="metric-icon">👤</div>
            <div className="metric-number">500+</div>
            <div className="metric-label">Health Professionals</div>
          </div>

          <div className="metric">
            <div className="metric-icon">📈</div>
            <div className="metric-number">99.9%</div>
            <div className="metric-label">System Uptime</div>
          </div>
        </div>
      </section>

      {/* Features Banner + Grid */}
      <section id="features" className="features-hero">
        {/* Picture placed at the top of "Everything You Need" section */}
        <div className="features-hero-banner">
          <img 
            src={antiviralVaccineImg} 
            alt="ANTIVIRAL VACCINATION - Animal bite prevention and treatment" 
          />
        </div>

        <div className="section-header">
          <h2>Everything You Need</h2>
          <p>Powerful features designed specifically for animal bite center management</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🏥</div>
            <h3>Multi-Clinic Support</h3>
            <p>Manage multiple animal bite centers from a single platform</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Staff Management</h3>
            <p>Easy staff onboarding with role-based access control</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <h3>Smart Scheduling</h3>
            <p>Automated patient scheduling with follow-up reminders</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📦</div>
            <h3>Inventory Tracking</h3>
            <p>Real-time vaccine inventory with expiration monitoring</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure & Compliant</h3>
            <p>HIPAA-compliant data security and patient privacy</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⏱️</div>
            <h3>Real-Time Updates</h3>
            <p>Live queue management and treatment status tracking</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works">
        <div className="section-header">
          <h2>How It Works</h2>
          <p>Simple, efficient workflow for incident management</p>
        </div>

        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Report Incident</h3>
            <p>Healthcare professionals quickly report animal bite incidents through the web or mobile app</p>
          </div>

          <div className="step-arrow">→</div>

          <div className="step">
            <div className="step-number">2</div>
            <h3>Assessment</h3>
            <p>System automatically evaluates risk level and vaccination status</p>
          </div>

          <div className="step-arrow">→</div>

          <div className="step">
            <div className="step-number">3</div>
            <h3>Action Plan</h3>
            <p>Generate treatment protocols and notify relevant healthcare providers</p>
          </div>

          <div className="step-arrow">→</div>

          <div className="step">
            <div className="step-number">4</div>
            <h3>Monitor & Track</h3>
            <p>Follow up on patient recovery and track outcomes over time</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Transform Your Animal Bite Management?</h2>
          <p>Join healthcare facilities already using AnimalCare to save lives</p>
          <a href="/login" className="btn btn-primary btn-large">Start Free Trial</a>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>AnimalCare</h4>
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
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#security">Security</a></li>
              <li><a href="#demo">Request Demo</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h5>Company</h5>
            <ul>
              <li><a href="#about">About Us</a></li>
              <li><a href="#blog">Blog</a></li>
              <li><a href="#careers">Careers</a></li>
              <li><a href="#press">Press</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h5>Support</h5>
            <ul>
              <li><a href="#help">Help Center</a></li>
              <li><a href="#contact">Contact Us</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 Tagoloan ABTC - Animal Bite Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}