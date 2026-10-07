// src/components/HeroSection.jsx
import { useNavigate } from 'react-router-dom';
import './HeroSection.css';
import './LandingExtras.css';

function HeroSection() {
  const navigate = useNavigate();
  const loggedIn = Boolean(localStorage.getItem('token'));

  const scrollToHow = () =>
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section id="hero" className="hero">
      <div className="hero-text">
        <p className="hero-tag">— STUDENT TO STUDENT SHARING. Made for students, by students. </p>
        <h1>
          Share more. <br />
          <span className="highlight">Spend less.</span> <br />
          Master your semester.
        </h1>
        <p className="hero-desc">
          The campus platform for college students to trade textbooks,
          lab gear, and academic tools safely and affordably.
        </p>
        <div className="hero-buttons">
          <button className="btn-primary" onClick={() => navigate(loggedIn ? '/hub' : '/login')}>
  {loggedIn ? 'Open your hub' : 'Start Sharing'}
</button>
          <button className="btn-secondary" onClick={scrollToHow}>See how it works</button>
        </div>
        {!loggedIn && (
          <p className="hero-login-hint">
            Already a member? <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Log in</a>
          </p>
        )}
      </div>

      <div className="hero-image">
  <div className="hero-art" aria-hidden="true">
    <div className="hero-blob" />
    <div className="art-card art-card--a"><span>📚</span><div><b>Organic Chemistry</b><small>Good · ₹120</small></div></div>
    <div className="art-card art-card--b"><span>🔬</span><div><b>Microscope</b><small>Lab gear · Free</small></div></div>
    <div className="art-card art-card--c"><span>🧮</span><div><b>Scientific Calculator</b><small>Lend · ₹30</small></div></div>
    <div className="art-pill">🔐 QR-verified handoffs</div>
  </div>
  <div className="hero-badge">✅ Gmail-verified students only</div>
</div>
    </section>
  );
}

export default HeroSection;
