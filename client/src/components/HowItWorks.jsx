// src/components/HowItWorks.jsx

import "./HowItWorks.css";

const steps = [
  {
    icon: "📸",
    step: "1",
    title: "List your items",
    desc: "Upload photos of books or equipment you no longer need in seconds. Set your own terms: borrow, swap, or sell.",
  },
  {
    icon: "💬",
    step: "2",
    title: "Connect with students",
    desc: "Chat with verified students from nearby campuses through our secure platform. Every user is verified with a university email.",
  },
  {
    icon: "🤝",
    step: "3",
    title: "Exchange and save",
    desc: "Meet on campus, swap gear, and keep your budget intact for things that matter. Build your academic network locally.",
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
        {steps.map((item, index) => (
          <div className="how-card" key={index}>
            <div className="how-icon">{item.icon}</div>
            <h3>{item.step}. {item.title}</h3>
            <p>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;
