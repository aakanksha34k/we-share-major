// client/src/components/NotificationBell.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './NotificationBell.css';

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Close dropdown if clicked outside
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await api.get('/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications');
    }
  };

  const markAsRead = async (id, notification) => {
    try {
      const token = localStorage.getItem('token');
      await api.put(`/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
      setShowDropdown(false);
      if (notification.type.startsWith('borrow_')) {
        navigate('/lending-dashboard');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await api.put(`/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <div className="bell-icon" onClick={() => setShowDropdown(!showDropdown)}>
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
                  onClick={() => markAsRead(n._id, n)}
                >
                  <p>{n.message}</p>
                  <span className="n-time">{new Date(n.createdAt).toLocaleDateString()}</span>
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
