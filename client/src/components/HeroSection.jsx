// src/components/HeroSection.jsx

import "./HeroSection.css";

function HeroSection() {
  return (
    <section id="hero" className="hero">
      <div className="hero-text">
        <p className="hero-tag">— STUDENT TO STUDENT SHARING</p>
        <p className="ak">Made for students, by students.</p>
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
          <button className="btn-primary">Start Sharing</button>
          <button className="btn-secondary">Browse Catalog</button>
        </div>
      </div>

      <div className="hero-image">
        <div className="hero-image-container" style={{ width: '100%', height: '100%', borderRadius: '16px', overflow: 'hidden' }}>
          <img src="/landing_image.png" alt="Students sharing resources" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div className="hero-badge">
          ✅ Campus ID Only — Verified Users
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
