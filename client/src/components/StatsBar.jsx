// src/components/StatsBar.jsx

import "./StatsBar.css";

const stats = [
  { value: "12,000+", label: "Active Students" },
  { value: "45,000+", label: "Items Shared" },
  { value: "₹2 Cr+", label: "Money Saved" },
];

function StatsBar() {
  return (
    <section id="stats" className="stats-bar">
      {stats.map((stat, index) => (
        <div className="stat-item" key={index}>
          <h2>{stat.value}</h2>
          <p>{stat.label}</p>
        </div>
      ))}
    </section>
  );
}

export default StatsBar;