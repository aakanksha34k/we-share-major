// src/components/Navbar.jsx

import { useState } from "react";
import "./Navbar.css";
import { Link } from 'react-router-dom';

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        🔗 We Share
      </div>

      <ul className={`navbar-links ${menuOpen ? "open" : ""}`}>
        <li><a href="#hero">Home</a></li>
        <li><a href="#how-it-works">How It Works</a></li>
        <li><a href="#stats">Impact</a></li>
        <li><a href="#footer">About Us</a></li>
      </ul>

      <div className="navbar-auth">
        <Link to="/login"><button className="btn-login">Log In</button></Link>
        <Link to="/register"><button className="btn-signup">Sign Up</button></Link>
      </div>

      <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
        ☰
      </div>
    </nav>
  );
}

export default Navbar;
