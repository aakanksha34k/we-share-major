import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ItemCard from '../components/ItemCard';
import NotificationBell from '../components/NotificationBell';
import api from '../api';
import './Dashboard.css';

const categories = [
  { icon: '📦', name: 'All Items', color: '#00b894', bg: 'linear-gradient(135deg, #00b894, #55efc4)' },
  { icon: '📚', name: 'Books', color: '#6c5ce7', bg: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' },
  { icon: '✏️', name: 'Stationery', color: '#e17055', bg: 'linear-gradient(135deg, #e17055, #fab1a0)' },
  { icon: '🔬', name: 'Lab Gear', color: '#0984e3', bg: 'linear-gradient(135deg, #0984e3, #74b9ff)' },
  { icon: '💻', name: 'Electronics', color: '#fdcb6e', bg: 'linear-gradient(135deg, #f39c12, #fdcb6e)' },
  { icon: '📦', name: 'Other', color: '#636e72', bg: 'linear-gradient(135deg, #636e72, #b2bec3)' },
];

function Dashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sort, setSort] = useState('newest');
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    const timer = setTimeout(fetchItems, 250);
    return () => clearTimeout(timer);
  }, [selectedCategory, search, sort]);

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { sort };
      if (selectedCategory && selectedCategory !== 'All Items') params.category = selectedCategory;
      if (search.trim()) params.search = search.trim();
      const response = await api.get('/items', { params });
      setItems(response.data);
    } catch (err) {
      console.error('Failed to fetch items:', err);
      setItems([]);
      setError(err.response?.data?.message || 'Unable to load marketplace items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const selectCategory = (name) => {
    setSelectedCategory(name);
    setSearch('');
  };

  return (
    <div className="dashboard dashboard--no-sidebar">
      <div className="dashboard-main">
        <div className="dashboard-topbar">
          <div className="topbar-left-brand"><span className="dashboard-logo">🔗 We Share</span></div>
          <div className="topbar-right">
            <button className="btn-sell" onClick={() => navigate('/hub')} style={{ marginRight: '10px', background: '#e0e7ff', color: '#3730a3' }}>← Hub</button>
            {user?.role === 'admin' && <button className="btn-sell" onClick={() => navigate('/admin')} style={{ marginRight: '10px', background: '#fef08a', color: '#854d0e' }}>🛡️ Admin Panel</button>}
            <NotificationBell />
            <button className="btn-sell" onClick={() => navigate('/messages')} style={{ marginRight: '10px', background: '#3b82f6', color: 'white' }}>💬 Messages</button>
            <button className="btn-sell" onClick={() => navigate('/lending-dashboard')} style={{ marginRight: '10px', background: '#e0e7ff', color: '#3730a3' }}>My Dashboard</button>
            <button className="btn-sell" onClick={() => navigate('/sell')}>+ Sell on Share</button>
            <div className="user-avatar" onClick={() => navigate('/profile')} title="View Profile">{user?.fullName?.charAt(0).toUpperCase() || 'U'}</div>
          </div>
        </div>

        {!selectedCategory ? (
          <div className="category-center-view">
            <div className="category-center-header">
              <h1>📦 Physical Marketplace</h1>
              <p>Choose a category to explore items shared by students near your campus</p>
            </div>
            <div className="category-center-grid">
              {categories.map((cat, index) => (
                <div key={cat.name} className="category-center-card" style={{ '--cat-bg': cat.bg, '--cat-color': cat.color, animationDelay: `${index * 0.08}s` }} onClick={() => selectCategory(cat.name)}>
                  <div className="category-center-icon">{cat.icon}</div>
                  <h3 className="category-center-name">{cat.name}</h3>
                  <span className="category-center-count">Explore {cat.name.toLowerCase()}</span>
                  <div className="category-center-arrow">→</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="category-pills-bar">
              <button className="category-back-btn" onClick={() => { setSelectedCategory(null); setSearch(''); }}>← Categories</button>
              <div className="category-pills">
                {categories.map(cat => <button key={cat.name} className={`category-pill ${selectedCategory === cat.name ? 'active' : ''}`} onClick={() => selectCategory(cat.name)}><span>{cat.icon}</span> {cat.name}</button>)}
              </div>
              <div className="search-bar">
                <span className="search-icon">🔍</span>
                <input type="text" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            <div className="feed-header">
              <div><h2>{selectedCategory}</h2><p>{loading ? 'Loading...' : `Showing ${items.length} available item${items.length === 1 ? '' : 's'}`}</p></div>
              <div className="feed-sort">
                <button className={`sort-btn ${sort === 'newest' ? 'active' : ''}`} onClick={() => setSort('newest')}>Newest</button>
                <button className={`sort-btn ${sort === 'priceAsc' ? 'active' : ''}`} onClick={() => setSort('priceAsc')}>Price: Low-High</button>
                <button className={`sort-btn ${sort === 'priceDesc' ? 'active' : ''}`} onClick={() => setSort('priceDesc')}>Price: High-Low</button>
              </div>
            </div>

            {error && <div className="sell-error" role="alert">{error} <button onClick={fetchItems}>Retry</button></div>}
            <div className="items-grid">
              {loading ? <div className="no-items"><p>Loading marketplace...</p></div> : items.length > 0 ? items.map(item => <ItemCard key={item._id} item={item} />) : <div className="no-items"><p>😕 No available items found{search ? ` for "${search}"` : ''}</p></div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
