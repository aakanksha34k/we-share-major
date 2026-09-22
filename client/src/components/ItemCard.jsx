import './ItemCard.css';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../api';

function ItemCard({ item }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);
  return (
    
    <div className="item-card">
      {/* Image */}
      <div className="item-image">
        {item.photos && item.photos.length > 0 ? (
          <img src={item.photos[0]} alt={item.title} />
        ) : item.image ? (
          <img src={item.image} alt={item.title} />
        ) : (
          <div className="item-image-placeholder">📦</div>
        )}
        <span className={`item-condition ${item.condition.toLowerCase()}`}>
          {item.condition}
        </span>
        {item.price === 0 && (
          <span className="item-free-badge">FREE</span>
        )}
        {item.price > 0 && (
          <span className="item-price-badge">₹{item.price}</span>
        )}
      </div>

      {/* Info */}
      <div className="item-info">
        <h4>{item.title}</h4>
        <p className="item-meta">
          🏫 {item.university} • {item.category}
        </p>
        <button
          className="btn-view"
          onClick={() => navigate(`/item/${item._id}`)}
        >
          View Details
        </button>
        {user?.role === 'admin' && (
          <button
            style={{ marginTop: '10px', width: '100%', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            onClick={async (e) => {
              e.stopPropagation();
              if (window.confirm('Delete this item (Admin)?')) {
                try {
                  await api.delete(`/admin/items/${item._id}`);
                  window.location.reload();
                } catch (err) {
                  alert('Failed to delete item.');
                }
              }
            }}
          >
            🗑️ Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default ItemCard;