// src/components/HowItWorks.jsx
import { Link } from 'react-router-dom';
import './HowItWorks.css';

const steps = [
  {
    icon: '📸',
    step: '1',
    title: 'List your items',
    desc: 'Upload photos of books or equipment you no longer need in seconds. Set your own terms: borrow, swap, or sell.',
  },
  {
    icon: '💬',
    step: '2',
    title: 'Connect with students',
    desc: 'Chat with verified students from nearby campuses through our secure platform. Every user signs up with a verified Gmail account.',
  },
  {
    icon: '🤝',
    step: '3',
    title: 'Exchange and save',
    desc: 'Meet on campus, swap gear, and keep your budget intact for things that matter. Build your academic network locally.',
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="how-it-works">
      <div className="how-header">
        <h2>How it Works</h2>
        <div className="how-underline"></div>
        <p>We've simplified the process of getting the gear you need. Save money and help fellow students in three easy steps.</p>
      </div>

      <div className="how-cards">
        {steps.map((item) => (
          <div className="how-card" key={item.step}>
            <div className="how-icon">{item.icon}</div>
            <h3>{item.step}. {item.title}</h3>
            <p>{item.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 44, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
        <Link to="/register" className="btn-signup" style={{ padding: '12px 28px' }}>Join We Share</Link>
        <Link to="/safety" style={{ color: '#00b894', fontWeight: 600, textDecoration: 'none' }}>Read the safety guide</Link>
      </div>
    </section>
  );
}

export default HowItWorks;
