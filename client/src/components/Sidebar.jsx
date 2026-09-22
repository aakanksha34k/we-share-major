// src/components/Sidebar.jsx
import './Sidebar.css';

const categories = [
  { icon: '📦', name: 'All Items' },
  { icon: '📚', name: 'Books' },
  { icon: '✏️', name: 'Stationery' },
  { icon: '🔬', name: 'Lab Gear' },
  { icon: '💻', name: 'Electronics' },
];

const universities = [
  'State University',
  'City Tech Institute',
  'West Medical School',
  'Central Arts College',
];

function Sidebar({ selectedCategory, setSelectedCategory }) {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        🔗 We Share
      </div>

      <div className="sidebar-section">
        <p className="sidebar-label">CATEGORIES</p>
        {categories.map(cat => (
          <div
            key={cat.name}
            className={`sidebar-item ${selectedCategory === cat.name ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.name)}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-section">
        <p className="sidebar-label">UNIVERSITY</p>
        {universities.map(uni => (
          <div key={uni} className="sidebar-item sidebar-uni">
            <span>🏫</span>
            <span>{uni}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-section">
        <p className="sidebar-label">PRICE RANGE</p>
        <div className="price-range">
          <input type="number" placeholder="Min" />
          <span>—</span>
          <input type="number" placeholder="Max" />
        </div>
        <div className="free-only">
          <input type="checkbox" id="freeOnly" />
          <label htmlFor="freeOnly">Show only Free Items</label>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;