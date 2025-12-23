import { useState, useCallback, useEffect } from 'react';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Notification types
  const NOTIFICATION_TYPES = {
    info: 'info',
    success: 'success',
    warning: 'warning',
    error: 'error',
    approval_pending: 'approval_pending',
    submission_received: 'submission_received',
    evaluation_needed: 'evaluation_needed'
  };

  // Update unread count
  const updateUnreadCount = useCallback((notifList) => {
    const count = notifList.filter(n => !n.read).length;
    setUnreadCount(count);
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    setLoading(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const url = unreadOnly ? '/api/notifications?unread=true' : '/api/notifications';
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
      updateUnreadCount(Array.isArray(data) ? data : []);
    } catch (err) {
      // Fallback to mock data when server is unavailable
      const mockNotifications = [
        { id: 1, message: 'New RFQ published', type: 'info', timestamp: new Date().toISOString(), read: false },
        { id: 2, message: 'Approval request pending', type: 'approval_pending', timestamp: new Date().toISOString(), read: false },
        { id: 3, message: 'Submission received', type: 'submission_received', timestamp: new Date().toISOString(), read: true }
      ];
      setNotifications(unreadOnly ? mockNotifications.filter(n => !n.read) : mockNotifications);
      updateUnreadCount(mockNotifications);
      console.log('Using mock notifications (server unavailable)');
    } finally {
      setLoading(false);
    }
  }, [updateUnreadCount]);

  // Create notification
  const addNotification = useCallback(async (notification) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...notification,
          timestamp: new Date().toISOString(),
          read: false
        })
      });
      if (!response.ok) throw new Error('Failed to create notification');
      const data = await response.json();
      setNotifications(prev => [data, ...prev]);
      setUnreadCount(prev => prev + 1);
      return data;
    } catch (err) {
      console.error('Error adding notification:', err);
      throw err;
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH'
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete notification');
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      updateUnreadCount(notifications.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, [notifications, updateUnreadCount]);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to clear notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  }, []);

  // Get notifications by type
  const getNotificationsByType = useCallback((type) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  // Get unread notifications
  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(n => !n.read);
  }, [notifications]);

  // Subscribe to notifications (WebSocket)
  const subscribeToNotifications = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/notifications/subscribe`);

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        const notification = JSON.parse(event.data);
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
      };

      return ws;
    } catch (err) {
      console.error('Error subscribing to notifications:', err);
      return null;
    }
  }, []);

  // Unsubscribe from notifications
  const unsubscribeFromNotifications = useCallback((ws) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    setIsConnected(false);
  }, []);

  // Send toast notification (temporary visual notification)
  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
      isToast: true
    };

    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    setTimeout(() => {
      deleteNotification(notification.id);
    }, duration);

    return notification.id;
  }, [deleteNotification]);

  // Auto-fetch notifications on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadNotifications = async () => {
      if (!isMounted) return;
      await fetchNotifications();
    };

    loadNotifications();

    // Set up polling every 30 seconds
    const interval = setInterval(() => {
      if (isMounted) {
        fetchNotifications();
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    isConnected,
    NOTIFICATION_TYPES,
    fetchNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    getNotificationsByType,
    getUnreadNotifications,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    showToast
  };
};

export default useNotifications;
