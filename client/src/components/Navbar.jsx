import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const loggedIn = Boolean(localStorage.getItem('token'));

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">🔗 We Share</Link>

      <ul className="navbar-links">
        <li><a href="#hero">Home</a></li>
        <li><a href="#how-it-works">How It Works</a></li>
        <li><a href="#stats">Impact</a></li>
        <li><a href="#footer">About Us</a></li>
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
    </nav>
  );
}

export default Navbar;