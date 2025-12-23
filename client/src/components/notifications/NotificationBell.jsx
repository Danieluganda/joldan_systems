import React, { useState, useEffect } from 'react';
import NotificationList from './NotificationList';
import './notifications.css';

/**
 * NotificationBell Component
 * 
 * Notification icon with badge showing unread count.
 * Opens dropdown with notification list on click.
 * 
 * Features:
 * - Unread count badge
 * - Dropdown notification list
 * - Visual indicators for notification priority
 * - Auto-dismiss functionality
 */

const NotificationBell = ({ count = 0, onNotificationClick = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Load notifications on component mount
  useEffect(() => {
    loadNotifications();
  }, []);

  // Load sample notifications
  const loadNotifications = () => {
    const mockNotifications = [
      {
        id: 1,
        title: 'Procurement Approved',
        message: 'Your procurement request has been approved',
        priority: 'high',
        timestamp: new Date(Date.now() - 5 * 60000),
        read: false,
        type: 'approval'
      },
      {
        id: 2,
        title: 'New Clarification',
        message: 'A bidder has posted a clarification question',
        priority: 'medium',
        timestamp: new Date(Date.now() - 15 * 60000),
        read: false,
        type: 'clarification'
      },
      {
        id: 3,
        title: 'Submission Deadline',
        message: 'RFQ submissions close in 2 hours',
        priority: 'high',
        timestamp: new Date(Date.now() - 30 * 60000),
        read: false,
        type: 'deadline'
      },
      {
        id: 4,
        title: 'Document Updated',
        message: 'The RFQ document has been updated',
        priority: 'low',
        timestamp: new Date(Date.now() - 1 * 3600000),
        read: true,
        type: 'document'
      },
      {
        id: 5,
        title: 'Evaluation Complete',
        message: 'Evaluation scoring is complete',
        priority: 'medium',
        timestamp: new Date(Date.now() - 2 * 3600000),
        read: true,
        type: 'evaluation'
      }
    ];

    setNotifications(mockNotifications);
  };

  // Mark notification as read
  const handleNotificationRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, read: true }
          : notif
      )
    );

    if (onNotificationClick) {
      onNotificationClick(notificationId);
    }
  };

  // Mark all as read
  const handleMarkAllRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  // Clear all notifications
  const handleClearAll = () => {
    setNotifications([]);
    setIsOpen(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Determine bell color based on priority of unread notifications
  const hasHighPriority = notifications.some(n => !n.read && n.priority === 'high');
  const bellClassName = `notification-bell ${hasHighPriority ? 'has-urgent' : ''}`;

  return (
    <div className="notification-container">
      {/* Bell Button */}
      <button
        className={bellClassName}
        onClick={() => setIsOpen(!isOpen)}
        title={`${unreadCount} unread notifications`}
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className={`notification-badge ${hasHighPriority ? 'urgent' : ''}`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="notification-dropdown">
          <NotificationList
            notifications={notifications}
            onNotificationClick={handleNotificationRead}
            onMarkAllRead={handleMarkAllRead}
            onClearAll={handleClearAll}
          />
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="notification-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell;
