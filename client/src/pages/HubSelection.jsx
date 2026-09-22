// client/src/pages/HubSelection.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HubSelection.css';

function HubSelection() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const firstName = user?.fullName?.split(' ')[0] || 'Student';

  return (
    <div className="hub-page">

      {/* Top Bar */}
      <div className="hub-topbar">
        <div className="hub-topbar-left">
          <span className="hub-logo">🔗 We Share</span>
        </div>
        <div className="hub-topbar-right">
          <span className="hub-user-name">Hey, {firstName}!</span>
          <div
            className="hub-avatar"
            onClick={() => navigate('/profile')}
            title="View Profile"
          >
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <button className="hub-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="hub-content">

        {/* Greeting */}
        <div className="hub-greeting">
          <h1>Welcome back, <span>{firstName}</span></h1>
          <p>Choose your resource hub to get started. Browse physical items on campus or explore digital study materials.</p>
        </div>

        {/* Hub Cards */}
        <div className="hub-cards">

          {/* Physical Resources Card */}
          <div
            className="hub-card hub-card--physical"
            onClick={() => navigate('/dashboard')}
          >
            <div className="hub-card-icon">📦</div>
            <h2 className="hub-card-title">Physical Resources</h2>
            <p className="hub-card-desc">
              Buy, sell, lend & borrow real-world items — textbooks, lab gear, electronics, stationery and more from peers near your campus.
            </p>
            <div className="hub-card-tags">
              <span className="hub-tag">📚 Books</span>
              <span className="hub-tag">🔬 Lab Gear</span>
              <span className="hub-tag">💻 Electronics</span>
              <span className="hub-tag">✏️ Stationery</span>
            </div>
            <button className="hub-card-cta">
              Browse Marketplace
              <span className="hub-card-arrow">→</span>
            </button>
          </div>

          {/* Digital Resources Card */}
          <div
            className="hub-card hub-card--digital"
            onClick={() => navigate('/digital-dashboard')}
          >
            <div className="hub-card-icon">📄</div>
            <h2 className="hub-card-title">Digital Resources</h2>
            <p className="hub-card-desc">
              Access and share study notes, PDFs, e-books, question papers and other downloadable academic materials from fellow students.
            </p>
            <div className="hub-card-tags">
              <span className="hub-tag">📝 Notes</span>
              <span className="hub-tag">📕 PDFs</span>
              <span className="hub-tag">📖 E-Books</span>
              <span className="hub-tag">📋 Papers</span>
            </div>
            <button className="hub-card-cta">
              Explore Library
              <span className="hub-card-arrow">→</span>
            </button>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="hub-footer">
        <p>We Share — By students, for students. © 2026</p>
      </div>
    </div>
  );
}

export default HubSelection;
