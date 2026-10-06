// src/components/Footer.jsx
import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
  return (
    <footer id="footer" className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <h2>
            <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>🔗 We Share</Link>
          </h2>
          <p>The campus platform for college students to trade textbooks, lab gear, and academic tools safely and affordably with each other.</p>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h4>Platform</h4>
            <ul>
              <li><a href="#hero">Home</a></li>
              <li><a href="#how-it-works">How it Works</a></li>
              <li><a href="#stats">Impact</a></li>
              <li><Link to="/login">Log In</Link></li>
              <li><Link to="/register">Sign Up</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Support</h4>
            <ul>
              <li><Link to="/help">Help Center</Link></li>
              <li><Link to="/safety">Safety Guide</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Legal</h4>
            <ul>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/cookies">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} We Share Platform. All rights reserved.</p>
        <p>Made with ❤️ for students, by students.</p>
      </div>
    </footer>
  );
}

export default Footer;