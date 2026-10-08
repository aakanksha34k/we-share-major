import './StatsBar.css';

// Honest highlights instead of made-up user numbers.
const stats = [
  { value: '₹0', label: 'To list an item' },
  { value: 'QR + Code', label: 'Verified handoffs' },
  { value: 'Gmail', label: 'Verified students only' },
];

function StatsBar() {
  return (
    <section id="stats" className="stats-bar">
      {stats.map((stat) => (
        <div className="stat-item" key={stat.label}>
          <h2>{stat.value}</h2>
          <p>{stat.label}</p>
        </div>
      ))}
    </section>
  );
}

export default StatsBar;
