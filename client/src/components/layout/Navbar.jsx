import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { usePermissions } from '../../hooks/usePermissions';
import NotificationBell from '../notifications/NotificationBell';
import './navbar.css';

/**
 * Navbar Component
 * 
 * Main navigation header with user menu, notifications, and search.
 * Displays application logo, user info, and quick actions.
 * 
 * Features:
 * - User profile menu with logout
 * - Real-time notifications
 * - Search functionality
 * - Help/Documentation links
 * - Quick actions menu
 * - Responsive design
 */

const Navbar = ({ user = null, onLogout = null }) => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { permissions } = usePermissions();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userInfo, setUserInfo] = useState(user || { name: 'Demo User', email: 'user@example.com', role: 'admin' });

  // Fetch user info on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch('/api/auth/user', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          setUserInfo(data);
        } else {
          console.log('Using demo user (server unavailable)');
        }
      } catch (error) {
        console.log('Using demo user (server unavailable)');
      }
    };
    
    if (!user) {
      fetchUser();
    } else {
      setUserInfo(user);
    }
  }, [user]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      const userMenu = document.querySelector('.navbar-user');
      if (userMenu && !userMenu.contains(e.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    if (onLogout) onLogout();
    navigate('/login');
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setShowUserMenu(false);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-logo">
          <a href="/">
            <span className="logo-icon">📋</span>
            <span className="logo-text">Procurement Discipline</span>
          </a>
        </div>

        {/* Search Bar */}
        <div className="navbar-search">
          <form onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search procurements, documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">
              🔍
            </button>
          </form>
        </div>

        {/* Right Side Actions */}
        <div className="navbar-actions">
          {/* Notifications */}
          <div className="navbar-notifications">
            <NotificationBell count={unreadCount} />
          </div>

          {/* Help/Docs */}
          <button 
            className="navbar-action-btn help-btn"
            title="Help & Documentation"
            onClick={() => window.open('/docs', '_blank')}
          >
            ❓
          </button>

          {/* Settings */}
          <button 
            className="navbar-action-btn settings-btn"
            title="Settings"
            onClick={() => navigate('/settings')}
          >
            ⚙️
          </button>

          {/* User Menu */}
          <div className="navbar-user">
            <button
              className="user-menu-toggle"
              onClick={() => setShowUserMenu(!showUserMenu)}
              title={`Logged in as ${userInfo?.name}`}
            >
              <span className="user-avatar">
                {userInfo?.name?.charAt(0) || 'U'}
              </span>
              <span className="user-name">{userInfo?.name || 'User'}</span>
              <span className="menu-arrow">▼</span>
            </button>

            {showUserMenu && (
              <div className="user-menu-dropdown">
                <div className="user-menu-header">
                  <div className="user-info">
                    <div className="user-full-name">{userInfo?.name || 'Unknown User'}</div>
                    <div className="user-email">{userInfo?.email || 'user@example.com'}</div>
                    <div className="user-role">Role: {userInfo?.role || 'User'}</div>
                  </div>
                </div>

                <div className="user-menu-divider"></div>

                <div className="user-menu-items">
                  <button 
                    className="user-menu-item"
                    onClick={() => {
                      navigate('/profile');
                      setShowUserMenu(false);
                    }}
                  >
                    👤 My Profile
                  </button>
                  <button 
                    className="user-menu-item"
                    onClick={() => {
                      navigate('/settings');
                      setShowUserMenu(false);
                    }}
                  >
                    ⚙️ Settings
                  </button>
                  <button 
                    className="user-menu-item"
                    onClick={() => {
                      navigate('/preferences');
                      setShowUserMenu(false);
                    }}
                  >
                    🎨 Preferences
                  </button>
                </div>

                <div className="user-menu-divider"></div>

                <div className="user-menu-items">
                  <button 
                    className="user-menu-item danger"
                    onClick={handleLogout}
                  >
                    🚪 Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="navbar-status">
        <span className="status-indicator online"></span>
        <span className="status-text">Online</span>
      </div>
    </nav>
  );
};

export default Navbar;
