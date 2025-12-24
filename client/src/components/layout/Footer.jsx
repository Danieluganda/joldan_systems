import React, { useState } from 'react';
import './footer.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXTwitter, faLinkedin, faGithub } from '@fortawesome/free-brands-svg-icons';


/**
 * Footer Component
 * 
 * Application footer with links, version info, and status indicators.
 * Displays copyright, support links, and system information.
 * 
 * Features:
 * - Company/legal information
 * - Support and documentation links
 * - System status indicators
 * - Version information
 * - Contact information
 * - Responsive layout
 */

const Footer = ({ version = '1.0.0', statusPage = null }) => {
  const [expandedSection, setExpandedSection] = useState(null);
  const currentYear = new Date().getFullYear();

  // Toggle section expansion on mobile
  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <footer className="app-footer">
      {/* Main Footer Content - Commented out for now */}
      {/* 
      <div className="footer-content">
        <div className="footer-column">
          <div 
            className="footer-column-header"
            onClick={() => toggleSection('product')}
          >
            <h4>📋 Procurement Discipline</h4>
            <span className="toggle-icon">▼</span>
          </div>
          <div className={`footer-column-content ${expandedSection === 'product' ? 'expanded' : ''}`}>
            <p className="footer-description">
              A comprehensive procurement management system ensuring PPDA compliance,
              transparency, and efficient bid management.
            </p>
            <div className="version-info">
              Version {version}
            </div>
          </div>
        </div>

        <div className="footer-column">
          <div 
            className="footer-column-header"
            onClick={() => toggleSection('support')}
          >
            <h4>❓ Support & Help</h4>
            <span className="toggle-icon">▼</span>
          </div>
          <div className={`footer-column-content ${expandedSection === 'support' ? 'expanded' : ''}`}>
            <ul className="footer-links">
              <li>
                <a href="/help" title="Help & Documentation">
                  📖 Help & Documentation
                </a>
              </li>
              <li>
                <a href="/user-guide" title="User Guide">
                  📚 User Guide
                </a>
              </li>
              <li>
                <a href="/faq" title="Frequently Asked Questions">
                  ❓ FAQ
                </a>
              </li>
              <li>
                <a href="/contact-support" title="Contact Support">
                  📧 Contact Support
                </a>
              </li>
              <li>
                <a href="/report-issue" title="Report an Issue">
                  🐛 Report Issue
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-column">
          <div 
            className="footer-column-header"
            onClick={() => toggleSection('legal')}
          >
            <h4>⚖️ Legal & Policy</h4>
            <span className="toggle-icon">▼</span>
          </div>
          <div className={`footer-column-content ${expandedSection === 'legal' ? 'expanded' : ''}`}>
            <ul className="footer-links">
              <li>
                <a href="/privacy-policy" title="Privacy Policy">
                  🔐 Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms-of-service" title="Terms of Service">
                  📋 Terms of Service
                </a>
              </li>
              <li>
                <a href="/data-protection" title="Data Protection">
                  🔒 Data Protection
                </a>
              </li>
              <li>
                <a href="/compliance" title="Compliance">
                  ✅ PPDA Compliance
                </a>
              </li>
              <li>
                <a href="/accessibility" title="Accessibility">
                  ♿ Accessibility
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-column">
          <div 
            className="footer-column-header"
            onClick={() => toggleSection('status')}
          >
            <h4>📊 System Status</h4>
            <span className="toggle-icon">▼</span>
          </div>
          <div className={`footer-column-content ${expandedSection === 'status' ? 'expanded' : ''}`}>
            <div className="status-group">
              <div className="status-item">
                <span className="status-dot online"></span>
                <span className="status-label">API Status</span>
              </div>
              <div className="status-value">Operational</div>
            </div>
            <div className="status-group">
              <div className="status-item">
                <span className="status-dot online"></span>
                <span className="status-label">Database</span>
              </div>
              <div className="status-value">Connected</div>
            </div>
            <div className="status-group">
              <div className="status-item">
                <span className="status-dot online"></span>
                <span className="status-label">Storage</span>
              </div>
              <div className="status-value">Available</div>
            </div>
            {statusPage && (
              <a href={statusPage} className="status-link">
                View Detailed Status →
              </a>
            )}
          </div>
        </div>
        
        <div className="footer-column">
          <div 
            className="footer-column-header"
            onClick={() => toggleSection('contact')}
          >
            <h4>📧 Contact</h4>
            <span className="toggle-icon">▼</span>
          </div>
          <div className={`footer-column-content ${expandedSection === 'contact' ? 'expanded' : ''}`}>
            <ul className="contact-info">
              <li>
                <span className="contact-icon">📧</span>
                <a href="mailto:support@example.com">
                  support@example.com
                </a>
              </li>
              <li>
                <span className="contact-icon">📞</span>
                <a href="tel:+1234567890">
                  +1 (234) 567-890
                </a>
              </li>
              <li>
                <span className="contact-icon">🌐</span>
                <a href="https://example.com" target="_blank" rel="noopener noreferrer">
                  www.example.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      */}
      
      {/* Bottom Bar */}
      <div className="footer-bottom">
        <div className="footer-left">
          <p className="copyright">
            © {currentYear} Procurement Discipline System. All rights reserved.
          </p>
        </div>

        <div className="footer-center">
          <div className="footer-stats">
            <span className="stat">
              <span className="stat-icon">✓</span>
              <span className="stat-label">100% PPDA Compliant</span>
            </span>
            <span className="stat-separator">•</span>
            <span className="stat">
              <span className="stat-icon">🔒</span>
              <span className="stat-label">Bank-Grade Security</span>
            </span>
          </div>
        </div>

        <div className="footer-right">
          <div className="social-links">
            <a href="https://x.com" title="X (Twitter)" target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faXTwitter} size="lg" />
            </a>
            <a href="https://linkedin.com" title="LinkedIn" target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faLinkedin} size="lg" />
            </a>
            <a href="https://github.com" title="GitHub" target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faGithub} size="lg" />
            </a>
          </div>
        </div>
      </div>

      {/* Accessibility Notice */}
      <div className="footer-accessibility">
        <p>
          🌐 <a href="/accessibility">This site meets WCAG 2.1 AA accessibility standards</a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
