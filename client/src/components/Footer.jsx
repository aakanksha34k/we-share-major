// src/components/Footer.jsx

import { Link } from 'react-router-dom';
import "./Footer.css";

function Footer() {
  return (
    <footer id="footer" className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <h2>🔗 We Share</h2>
          <p>The campus platform for college students to trade textbooks, lab gear, and academic tools safely and affordably.</p>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h4>Platform</h4>
            <ul>
              <li><a href="#hero">Home</a></li>
              <li><a href="#how-it-works">How it Works</a></li>
              <li><a href="#stats">Impact</a></li>
              <li><Link to="/login">Log In</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Support</h4>
            <ul>
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Safety Guide</a></li>
              <li><a href="#">Contact Us</a></li>
              <li><a href="#">FAQ</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2024 We Share Platform. All rights reserved.</p>
        <p>Made with ❤️ for students, by students.</p>
      </div>
    </footer>
  );
}

export default Footer;
