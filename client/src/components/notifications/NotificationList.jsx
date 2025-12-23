import React, { useState } from 'react';
import './notifications.css';

/**
 * NotificationList Component
 * 
 * Displays a list of notifications with filtering and actions.
 * Shows notification details, priority, and timestamps.
 * 
 * Features:
 * - Notification list with priority indicators
 * - Filter by read/unread status
 * - Mark individual or all notifications as read
 * - Clear notifications
 * - Click to action navigation
 * - Empty state message
 */

const NotificationList = ({
  notifications = [],
  onNotificationClick = null,
  onMarkAllRead = null,
  onClearAll = null
}) => {
  const [filterStatus, setFilterStatus] = useState('all'); // all, unread, read

  // Filter notifications
  const filteredNotifications = notifications.filter(notif => {
    if (filterStatus === 'unread') return !notif.read;
    if (filterStatus === 'read') return notif.read;
    return true;
  });

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    const iconMap = {
      approval: '✓',
      clarification: '💬',
      deadline: '⏰',
      document: '📄',
      evaluation: '⭐',
      award: '🏆',
      default: '📬'
    };
    return iconMap[type] || iconMap.default;
  };

  // Get notification color based on priority
  const getPriorityClass = (priority) => {
    return `priority-${priority}`;
  };

  // Format timestamp
  const formatTime = (date) => {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(date).toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notification-list-container">
      {/* Header */}
      <div className="notification-list-header">
        <h3>Notifications</h3>
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount} unread</span>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="notification-filters">
        <button
          className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          All
        </button>
        <button
          className={`filter-tab ${filterStatus === 'unread' ? 'active' : ''}`}
          onClick={() => setFilterStatus('unread')}
        >
          Unread ({unreadCount})
        </button>
        <button
          className={`filter-tab ${filterStatus === 'read' ? 'active' : ''}`}
          onClick={() => setFilterStatus('read')}
        >
          Read
        </button>
      </div>

      {/* Notifications List */}
      <div className="notification-items-container">
        {filteredNotifications.length > 0 ? (
          <div className="notification-items">
            {filteredNotifications.map(notif => (
              <div
                key={notif.id}
                className={`notification-item ${notif.read ? 'read' : 'unread'} ${getPriorityClass(notif.priority)}`}
                onClick={() => onNotificationClick && onNotificationClick(notif.id)}
              >
                {/* Icon */}
                <div className="notification-item-icon">
                  {getNotificationIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="notification-item-content">
                  <div className="notification-item-title">
                    {notif.title}
                  </div>
                  <div className="notification-item-message">
                    {notif.message}
                  </div>
                  <div className="notification-item-meta">
                    <span className="notification-time">
                      {formatTime(notif.timestamp)}
                    </span>
                    {!notif.read && (
                      <span className="notification-indicator">●</span>
                    )}
                  </div>
                </div>

                {/* Priority Badge */}
                <div className="notification-priority-badge">
                  {notif.priority === 'high' && '🔴'}
                  {notif.priority === 'medium' && '🟡'}
                  {notif.priority === 'low' && '🟢'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="notification-empty">
            <div className="empty-icon">📭</div>
            <div className="empty-text">
              {filterStatus === 'all' && 'No notifications'}
              {filterStatus === 'unread' && 'No unread notifications'}
              {filterStatus === 'read' && 'No read notifications'}
            </div>
          </div>
        )}
      </div>

      {/* Actions Footer */}
      {notifications.length > 0 && (
        <div className="notification-list-footer">
          {unreadCount > 0 && (
            <button
              className="footer-action-btn mark-read"
              onClick={onMarkAllRead}
              title="Mark all as read"
            >
              ✓ Mark all read
            </button>
          )}
          <button
            className="footer-action-btn clear-all"
            onClick={onClearAll}
            title="Clear all notifications"
          >
            🗑️ Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationList;
