import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import AnnouncementPopup from './AnnouncementPopup';
import './AppHeader.css';

const readUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
};

// "+ List item" belongs to the physical marketplace only. The Digital Library has its own
// "+ Upload PDF" button inside the page, so the two actions are never mixed up.
const PHYSICAL_PATHS = ['/dashboard', '/item', '/lending-dashboard', '/borrow', '/handoff'];

export default function AppHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const user = readUser();
  const initial = user.fullName?.charAt(0).toUpperCase() || 'U';
  const showListItem = PHYSICAL_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  const links = [
    ['/hub', 'Hub'],
    ['/dashboard', 'Marketplace'],
    ['/digital-dashboard', 'Digital'],
    ['/lending-dashboard', 'My Dashboard'],
    ['/messages', 'Messages'],
    ...(user.role === 'admin' ? [['/admin', 'Admin']] : [])
  ];

  return (
    <>
      <header className="ah">
        <NavLink to="/hub" className="ah-logo">🔗 We Share</NavLink>

        <nav className="ah-nav">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `ah-link ${isActive ? 'active' : ''}`}>{label}</NavLink>
          ))}
          {showListItem && <NavLink to="/sell" className="ah-sell">+ List item</NavLink>}
        </nav>

        <div className="ah-right">
          <NotificationBell />
          <div className="ah-user" ref={menuRef}>
            <button className="ah-user-btn" onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu" aria-expanded={menuOpen}>
              <span className="ah-avatar">{initial}</span>
              <span className="ah-name">{user.fullName?.split(' ')[0] || 'Account'}</span>
              <span aria-hidden>▾</span>
            </button>
            {menuOpen && (
              <div className="ah-menu" role="menu">
                <div className="ah-menu-id">
                  <strong>{user.fullName}</strong>
                  <span>{user.email}</span>
                </div>
                <button role="menuitem" onClick={() => { setMenuOpen(false); navigate('/profile'); }}>My profile</button>
                <button role="menuitem" onClick={() => { setMenuOpen(false); navigate('/help'); }}>Help</button>
                <button role="menuitem" onClick={() => { setMenuOpen(false); navigate('/complaints'); }}>Report a problem</button>
                <button role="menuitem" className="ah-logout" onClick={logout}>Log out</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <AnnouncementPopup />
    </>
  );
}
