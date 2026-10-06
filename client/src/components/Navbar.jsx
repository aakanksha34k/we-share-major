// src/components/Navbar.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const loggedIn = Boolean(localStorage.getItem('token'));
  const close = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo" onClick={close}>🔗 We Share</Link>

      <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
        <li><a href="#hero" onClick={close}>Home</a></li>
        <li><a href="#how-it-works" onClick={close}>How It Works</a></li>
        <li><a href="#stats" onClick={close}>Impact</a></li>
        <li><a href="#footer" onClick={close}>About Us</a></li>

        {/* the desktop buttons are hidden on phones, so the menu carries them */}
        <li className="navbar-mobile-auth">
          {loggedIn ? (
            <Link to="/hub" onClick={close}>Go to Hub</Link>
          ) : (
            <>
              <Link to="/login" onClick={close}>Log In</Link>
              <Link to="/register" onClick={close}>Sign Up</Link>
            </>
          )}
        </li>
      </ul>

      <div className="navbar-auth">
        {loggedIn ? (
          <Link to="/hub" className="btn-signup">Go to Hub</Link>
        ) : (
          <>
            <Link to="/login" className="btn-login">Log In</Link>
            <Link to="/register" className="btn-signup">Sign Up</Link>
          </>
        )}
      </div>

      <button
        type="button"
        className="hamburger"
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        ☰
      </button>
    </nav>
  );
}

export default Navbar;
