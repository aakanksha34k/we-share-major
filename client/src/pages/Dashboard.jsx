import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import ItemCard from '../components/ItemCard';
import './Dashboard.css';

const CATEGORIES = [
  { icon: '📦', name: 'All Items', color: '#00b894', bg: 'linear-gradient(135deg, #00b894, #55efc4)' },
  { icon: '📚', name: 'Books', color: '#0984e3', bg: 'linear-gradient(135deg, #0984e3, #74b9ff)' },
  { icon: '✏️', name: 'Stationery', color: '#f39c12', bg: 'linear-gradient(135deg, #f39c12, #fdcb6e)' },
  { icon: '🔬', name: 'Lab Gear', color: '#6c5ce7', bg: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' },
  { icon: '💻', name: 'Electronics', color: '#e17055', bg: 'linear-gradient(135deg, #e17055, #fab1a0)' },
  { icon: '🧩', name: 'Other', color: '#636e72', bg: 'linear-gradient(135deg, #636e72, #b2bec3)' }
];

const TYPE_FILTERS = [['all', 'All'], ['lend', '🔄 Lending'], ['sell', '🏷️ For sale']];
const SORTS = [['newest', 'Newest'], ['priceAsc', 'Price ↑'], ['priceDesc', 'Price ↓']];

function Dashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState(null); // null = category picker
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('newest');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/items');
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the marketplace. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c = { 'All Items': items.length };
    items.forEach((i) => { c[i.category] = (c[i.category] || 0) + 1; });
    return c;
  }, [items]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items.filter((i) => {
      if (category && category !== 'All Items' && i.category !== category) return false;
      if (type === 'sell' && i.listingType !== 'sell') return false;
      if (type === 'lend' && i.listingType === 'sell') return false;
      if (q && !`${i.title} ${i.description || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const price = (i) => (i.isFree ? 0 : Number(i.price || 0));
    if (sort === 'priceAsc') list.sort((a, b) => price(a) - price(b));
    else if (sort === 'priceDesc') list.sort((a, b) => price(b) - price(a));
    else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [items, category, search, type, sort]);

  const searching = search.trim().length > 0;
  const showPicker = !category && !searching;

  return (
    <div className="dashboard dashboard--no-sidebar">
      <div className="dashboard-main">
        <div className="search-bar" style={{ marginBottom: 20 }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search books, lab coats, calculators…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search items"
          />
        </div>

        {error && (
          <div className="no-items" role="alert">
            <p>{error}</p>
            <button className="btn-sell" onClick={load}>Try again</button>
          </div>
        )}

        {!error && showPicker && (
          <div className="category-center-view">
            <div className="category-center-header">
              <h1>What are you looking for?</h1>
              <p>Borrow or buy from students on your campus. Pick a category to start.</p>
            </div>
            <div className="category-center-grid">
              {CATEGORIES.map((cat, index) => (
                <div
                  key={cat.name}
                  className="category-center-card"
                  style={{ '--cat-bg': cat.bg, '--cat-color': cat.color, animationDelay: `${index * 0.07}s` }}
                  onClick={() => setCategory(cat.name)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setCategory(cat.name)}
                >
                  <div className="category-center-icon">{cat.icon}</div>
                  <h3 className="category-center-name">{cat.name}</h3>
                  <span className="category-center-count">
                    {loading ? '…' : `${counts[cat.name] || 0} ${(counts[cat.name] || 0) === 1 ? 'item' : 'items'}`}
                  </span>
                  <div className="category-center-arrow">→</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!error && !showPicker && (
          <>
            <div className="category-pills-bar">
              <button className="category-back-btn" onClick={() => { setCategory(null); setSearch(''); }}>
                ← Categories
              </button>
              <div className="category-pills">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.name}
                    className={`category-pill ${category === cat.name ? 'active' : ''}`}
                    onClick={() => setCategory(cat.name)}
                  >
                    <span>{cat.icon}</span> {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="feed-header">
              <div>
                <h2>{searching && !category ? `Results for “${search.trim()}”` : category}</h2>
                <p>{loading ? 'Loading…' : `${visible.length} ${visible.length === 1 ? 'item' : 'items'} available`}</p>
              </div>
              <div className="feed-controls">
                <div className="type-filter" role="group" aria-label="Listing type">
                  {TYPE_FILTERS.map(([v, label]) => (
                    <button key={v} className={type === v ? 'is-active' : ''} onClick={() => setType(v)}>{label}</button>
                  ))}
                </div>
                <div className="feed-sort">
                  {SORTS.map(([v, label]) => (
                    <button key={v} className={`sort-btn ${sort === v ? 'active' : ''}`} onClick={() => setSort(v)}>{label}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="items-grid">
              {loading && Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton-card" />)}
              {!loading && visible.length === 0 && (
                <div className="no-items">
                  <p>{searching ? `No items match “${search.trim()}”.` : 'Nothing here yet. Be the first to list something!'}</p>
                </div>
              )}
              {!loading && visible.map((item) => <ItemCard key={item._id} item={item} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;