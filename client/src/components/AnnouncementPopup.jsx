import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';

const clean = (message) => String(message || '').replace(/^📢\s*Admin Announcement:\s*/i, '');

// Shows every UNREAD admin announcement as a pop-up, one at a time, until the student clicks "Got it".
export default function AnnouncementPopup() {
  const [queue, setQueue] = useState([]);
  const dismissed = useRef(new Set());

  const load = useCallback(async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const { data } = await api.get('/notifications');
      setQueue(data.filter((n) => n.type === 'announcement' && !n.isRead && !dismissed.current.has(n._id)));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  const current = queue[0];

  const dismiss = useCallback(async () => {
    if (!current) return;
    dismissed.current.add(current._id);
    setQueue((q) => q.slice(1));
    try { await api.put(`/notifications/${current._id}/read`); } catch { /* ignore */ }
  }, [current]);

  useEffect(() => {
    if (!current) return undefined;
    const onKey = (e) => e.key === 'Escape' && dismiss();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [current, dismiss]);

  if (!current) return null;

  return (
    <div className="ann-overlay" onMouseDown={(e) => e.target === e.currentTarget && dismiss()}>
      <div className="ann-card" role="dialog" aria-modal="true" aria-labelledby="ann-title">
        <div className="ann-icon">📢</div>
        <h2 id="ann-title">Announcement from the admin</h2>
        <p className="ann-text">{clean(current.message)}</p>
        <span className="ann-time">
          {new Date(current.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          {queue.length > 1 && ` · ${queue.length - 1} more waiting`}
        </span>
        <button className="ann-btn" onClick={dismiss} autoFocus>Got it</button>
      </div>
    </div>
  );
}
