// client/src/components/NotificationBell.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './NotificationBell.css';

// Notifications whose relatedId is a BorrowRequest: open that transaction directly.
const REQUEST_TYPES = new Set([
  'borrow_request', 'borrow_approved', 'borrow_denied', 'payment_success',
  'handoff_ready', 'handoff_verified', 'borrow_reminder', 'borrow_due',
  'borrow_overdue', 'late_fee_required', 'late_fee_paid', 'borrow_returned',
  'return_date_confirmed', 'return_verified'
]);

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        if (!localStorage.getItem('token')) return;
        const res = await api.get('/notifications');
        setNotifications(res.data);
      } catch {
        console.error('Failed to fetch notifications');
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const refresh = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch {
      /* ignore */
    }
  };
    if (notification.type === 'complaint_update') {
    navigate(notification.relatedId ? `/borrow/${notification.relatedId}` : '/complaints');
    return;
  }

  const openNotification = async (notification) => {
    try {
      await api.put(`/notifications/${notification._id}/read`);
      refresh();
    } catch (err) {
      console.error(err);
    }

    setShowDropdown(false);

    if (notification.relatedId && REQUEST_TYPES.has(notification.type)) {
      navigate(`/borrow/${notification.relatedId}`);
    } else if (notification.type.startsWith('item_')) {
      navigate('/lending-dashboard');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <div
        className="bell-icon"
        role="button"
        tabIndex={0}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        onClick={() => setShowDropdown(!showDropdown)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setShowDropdown(!showDropdown)}
      >
        🔔
        {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
      </div>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="n-header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button className="btn-mark-all" onClick={markAllAsRead}>Mark all as read</button>
            )}
          </div>
          <div className="n-list">
            {notifications.length === 0 ? (
              <p className="n-empty">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`n-item ${n.isRead ? 'read' : 'unread'}`}
                  onClick={() => openNotification(n)}
                >
                  <p>{n.message}</p>
                  <span className="n-time">{new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
