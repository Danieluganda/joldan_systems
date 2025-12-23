import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import './sidebar.css';

/**
 * Sidebar Component
 * 
 * Main navigation menu for the application with feature access control.
 * Displays collapsible menu items based on user permissions.
 * 
 * Features:
 * - Feature-based menu organization
 * - Permission-based visibility
 * - Active route highlighting
 * - Collapsible sub-menus
 * - Quick access shortcuts
 * - Mobile responsive
 */

const Sidebar = ({ isOpen = true, onToggle = null }) => {
  const location = useLocation();
  const { hasPermission } = usePermissions();
  const [expandedMenus, setExpandedMenus] = useState({
    procurement: true,
    templates: false,
    evaluation: false,
    approvals: false,
    awards: false,
    audit: false
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toggle submenu
  const toggleMenu = (menu) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  // Check if route is active
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  // Menu structure with permissions
  const menuItems = [
    // Dashboard
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: '📊',
      required: true
    },

    // Feature 1: Planning & Setup
    {
      label: 'Procurement Setup',
      icon: '🎯',
      submenu: true,
      menu: 'procurement',
      items: [
        { label: 'New Procurement', path: '/procurements/new', icon: '➕' },
        { label: 'My Procurements', path: '/procurements', icon: '📋' },
        { label: 'Planning', path: '/planning', icon: '📝' },
      ]
    },

    // Feature 2: Templates & RFQ
    {
      label: 'Templates & RFQ',
      icon: '📄',
      submenu: true,
      menu: 'templates',
      items: [
        { label: 'Templates', path: '/templates', icon: '📑' },
        { label: 'RFQ Workspace', path: '/rfq-workspace', icon: '✏️' },
        { label: 'RFQ Editor', path: '/rfq-editor', icon: '📝' },
      ]
    },

    // Feature 6: Clarifications
    {
      label: 'Clarifications',
      path: '/clarifications',
      icon: '💬',
      required: true
    },

    // Feature 7: Submissions
    {
      label: 'Submissions',
      path: '/submissions',
      icon: '📬',
      required: true
    },

    // Feature 8: Evaluation
    {
      label: 'Evaluation & Scoring',
      icon: '⭐',
      submenu: true,
      menu: 'evaluation',
      items: [
        { label: 'Scoring', path: '/evaluation', icon: '📊' },
        { label: 'Results', path: '/evaluation/results', icon: '🏆' },
      ]
    },

    // Feature 10: Approvals
    {
      label: 'Approvals',
      icon: '✓',
      submenu: true,
      menu: 'approvals',
      items: [
        { label: 'Approval Queue', path: '/approvals', icon: '⏳' },
        { label: 'History', path: '/approvals/history', icon: '📜' },
      ]
    },

    // Feature 11: Award & Contract
    {
      label: 'Award & Contract',
      icon: '🏅',
      submenu: true,
      menu: 'awards',
      items: [
        { label: 'Award Decision', path: '/awards', icon: '🎖️' },
        { label: 'Contracts', path: '/contracts', icon: '📋' },
      ]
    },

    // Feature 12: Audit & Compliance
    {
      label: 'Audit & Compliance',
      icon: '🔍',
      submenu: true,
      menu: 'audit',
      items: [
        { label: 'Audit Packs', path: '/audit', icon: '📦' },
        { label: 'Compliance', path: '/audit/compliance', icon: '✅' },
      ]
    },

    // Feature 5: Documents (integrated)
    {
      label: 'Documents',
      path: '/documents',
      icon: '🗂️',
      required: true
    },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'} ${isMobile ? 'mobile' : 'desktop'}`}>
      {/* Sidebar Toggle Button */}
      <div className="sidebar-header">
        <button 
          className="sidebar-toggle"
          onClick={onToggle}
          title="Toggle sidebar"
        >
          {isOpen ? '◀' : '▶'}
        </button>
        {isOpen && <span className="sidebar-title">Navigation</span>}
      </div>

      {/* Menu Items */}
      <nav className="sidebar-menu">
        {menuItems.map((item, index) => {
          // Check permissions
          if (item.required === false && !hasPermission(item.permission)) {
            return null;
          }

          return (
            <div key={index} className="menu-section">
              {item.submenu ? (
                // Submenu Item
                <>
                  <button
                    className={`menu-item submenu-toggle ${expandedMenus[item.menu] ? 'expanded' : ''}`}
                    onClick={() => toggleMenu(item.menu)}
                    title={item.label}
                  >
                    <span className="menu-icon">{item.icon}</span>
                    {isOpen && (
                      <>
                        <span className="menu-label">{item.label}</span>
                        <span className="submenu-arrow">
                          {expandedMenus[item.menu] ? '▼' : '▶'}
                        </span>
                      </>
                    )}
                  </button>

                  {isOpen && expandedMenus[item.menu] && (
                    <div className="submenu">
                      {item.items.map((subitem, subindex) => (
                        <Link
                          key={subindex}
                          to={subitem.path}
                          className={`submenu-item ${isActive(subitem.path) ? 'active' : ''}`}
                          title={subitem.label}
                        >
                          <span className="submenu-icon">{subitem.icon}</span>
                          <span className="submenu-label">{subitem.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                // Regular Menu Item
                <Link
                  to={item.path}
                  className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
                  title={item.label}
                >
                  <span className="menu-icon">{item.icon}</span>
                  {isOpen && <span className="menu-label">{item.label}</span>}
                </Link>
              )}
            </div>
          );
        })}
      </nav>
     
      {/* Quick Access */}
      {isOpen && (

       
        <div className="sidebar-quick-access">
          <div className="quick-access-title">Quick Access</div>
          <Link to="/procurements/new" className="quick-access-item primary">
            ➕ New Procurement
          </Link>
          <Link to="/approvals" className="quick-access-item">
            ⏳ Pending Approvals
          </Link>
          <Link to="/audit" className="quick-access-item">
            📦 Audit Packs
          </Link>
        </div>   
      )}
     
      {/* Footer */}
      {isOpen && (
        <div className="sidebar-footer">
          <div className="footer-item">
            <span className="footer-icon">ℹ️</span>
            <span className="footer-text">Help & Support</span>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
