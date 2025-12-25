import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import './sidebar.css';

/**
 * Sidebar Component - ENHANCED with STEP Features
 * 
 * Main navigation menu for the application with feature access control.
 * Displays collapsible menu items based on user permissions.
 * 
 * Features:
 * - Feature-based menu organization
 * - STEP procurement planning (NEW)
 * - Excel import for procurement plans (NEW)
 * - STEP analytics and dashboards (NEW)
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
    plans: true,        // Show plans by default since it's main feature
    procurement: false,
    templates: false,
    evaluation: false,
    approvals: false,
    awards: false,
    audit: false,
    analytics: false
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

  // Handle link click with logging
  const handleLinkClick = (path, label) => {
    console.log('🔗 SIDEBAR LINK CLICKED:', {
      path,
      label,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  // Clean, organized menu structure
  const menuItems = [
    // Main Dashboard
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: '📊',
      required: true
    },

    // PLANNING SECTION
    {
      label: 'Procurement Plans',
      icon: '📑',
      submenu: true,
      menu: 'plans',
      items: [
        { label: 'All Plans', path: '/plans', icon: '📋' },
        { label: 'Create Plan', path: '/plans/create', icon: '➕' },
        { label: 'Import Excel', path: '/plans/import', icon: '📤' },
        { label: 'Templates', path: '/plans/templates', icon: '📄' },
        { label: 'Workplans', path: '/plans/workplans', icon: '📊' },
        { label: 'STEP Methods', path: '/plans/methods', icon: '🔧' },
      ]
    },

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

    // BIDDING SECTION
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

    {
      label: 'Clarifications',
      path: '/clarifications',
      icon: '💬',
      required: true
    },

    {
      label: 'Submissions',
      path: '/submissions',
      icon: '📬',
      required: true
    },

    // EVALUATION SECTION
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

    // APPROVAL & AWARD SECTION
    {
      label: 'Approvals',
      icon: '✓',
      submenu: true,
      menu: 'approvals',
      items: [
        { label: 'Approval Queue', path: '/approvals', icon: '⏳' },
        { label: 'Plan Approvals', path: '/approvals/plans', icon: '📑' },
        { label: 'Bank Approvals', path: '/plans/bank-approvals', icon: '🏦' },
        { label: 'History', path: '/approvals/history', icon: '📜' },
      ]
    },

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

    // COMPLIANCE & REPORTING SECTION
    {
      label: 'Audit & Compliance',
      icon: '🔍',
      submenu: true,
      menu: 'audit',
      items: [
        { label: 'Audit Packs', path: '/audit', icon: '📦' },
        { label: 'Compliance', path: '/audit/compliance', icon: '✅' },
        { label: 'STEP Compliance', path: '/audit/step', icon: '🎯' },
      ]
    },

    {
      label: 'Analytics & Reports',
      icon: '📈',
      submenu: true,
      menu: 'analytics',
      items: [
        { label: 'Overview', path: '/analytics', icon: '📊' },
        { label: 'STEP Analytics', path: '/analytics/step', icon: '🎯' },
        { label: 'Budget Analytics', path: '/analytics/budget', icon: '💰' },
        { label: 'Performance', path: '/analytics/performance', icon: '📉' },
      ]
    },

    // DOCUMENTS & FILES
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
        
        {/* Quick Actions in Header - Subtle */}
        {isOpen && (
          <div className="header-quick-actions">
            <Link to="/plans/create" className="header-quick-btn" title="New Plan">➕</Link>
            <Link to="/plans/import" className="header-quick-btn" title="Import">📤</Link>
          </div>
        )}
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
                          onClick={() => handleLinkClick(subitem.path, subitem.label)}
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
                  onClick={() => handleLinkClick(item.path, item.label)}
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
     
     
    </aside>
  );
};

export default Sidebar;
