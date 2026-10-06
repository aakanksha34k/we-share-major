import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import './AppHeader.css';

const readUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
};

export default function AppHeader() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const user = readUser();
  const initial = user.fullName?.charAt(0).toUpperCase() || 'U';

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
    <header className="ah">
      <NavLink to="/hub" className="ah-logo">🔗 We Share</NavLink>

         <nav className="ah-nav">
     {links.map(([to, label]) => (
       <NavLink key={to} to={to}
         className={({ isActive }) => `ah-link ${isActive ? 'active' : ''}`}>{label}</NavLink>
     ))}
     <NavLink to="/sell" className="ah-sell">+ List item</NavLink>
   </nav>

      <div className="ah-right">
        <NotificationBell />
        <div className="ah-user" ref={menuRef}>
          <button className="ah-user-btn" onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen}>
            <span className="ah-avatar">{initial}</span>
            <span className="ah-name">{user.fullName?.split(' ')[0] || 'Account'}</span>
            <span aria-hidden>▾</span>
          </button>
          {menuOpen && (
            <div className="ah-menu" role="menu">
              <div className="ah-menu-id"><strong>{user.fullName}</strong><span>{user.email}</span></div>
              <button role="menuitem" onClick={() => { setMenuOpen(false); navigate('/profile'); }}>My profile</button>
              <button role="menuitem" onClick={() => { setMenuOpen(false); navigate('/help'); }}>Help</button>
              <button role="menuitem" className="ah-logout" onClick={logout}>Log out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}