import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './NotificationBell.css';

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

  const refresh = async () => {
    try {
      if (!localStorage.getItem('token')) return;
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const openNotification = async (n) => {
    try { await api.put(`/notifications/${n._id}/read`); refresh(); } catch { /* ignore */ }
    setShowDropdown(false);

    if (n.type === 'complaint_update') {
      navigate(n.relatedId ? `/borrow/${n.relatedId}` : '/complaints');
    } else if (n.type === 'new_message' && n.relatedId) {
      navigate(`/messages/${n.relatedId}`);
    } else if (n.relatedId && REQUEST_TYPES.has(n.type)) {
      navigate(`/borrow/${n.relatedId}`);
    } else if (n.type.startsWith('item_')) {
      navigate('/lending-dashboard');
    }
  };

  const markAllAsRead = async () => {
    try { await api.put('/notifications/read-all'); refresh(); } catch { /* ignore */ }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <div className="bell-icon" role="button" tabIndex={0}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        onClick={() => setShowDropdown((s) => !s)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setShowDropdown((s) => !s)}>
        🔔
        {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
      </div>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="n-header">
            <h4>Notifications</h4>
            {unreadCount > 0 && <button className="btn-mark-all" onClick={markAllAsRead}>Mark all as read</button>}
          </div>
          <div className="n-list">
            {notifications.length === 0 ? (
              <p className="n-empty">No notifications yet.</p>
            ) : notifications.map((n) => (
              <div key={n._id} className={`n-item ${n.isRead ? 'read' : 'unread'}`} onClick={() => openNotification(n)}>
                <p>{n.message}</p>
                <span className="n-time">
                  {new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;