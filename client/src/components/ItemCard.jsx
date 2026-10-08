import './ItemCard.css';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import TypeBadge, { isSaleType } from './TypeBadge';

function ItemCard({ item }) {
  const navigate = useNavigate();
  let isAdmin = false;
  try { isAdmin = JSON.parse(localStorage.getItem('user') || '{}').role === 'admin'; } catch { /* ignore */ }

  const sale = isSaleType(item.listingType);
  const photo = item.photos?.[0] || item.image;

  return (
    <div className={`item-card item-card--${sale ? 'sell' : 'lend'}`} onClick={() => navigate(`/item/${item._id}`)}>
      <div className="item-image">
        {photo ? <img src={photo} alt={item.title} loading="lazy" /> : <div className="item-image-placeholder">📦</div>}
        <span className={`item-condition ${(item.condition || '').toLowerCase()}`}>{item.condition || 'N/A'}</span>
        {item.price === 0 && !sale && <span className="item-free-badge">FREE</span>}
        {item.price > 0 && (
          <span className="item-price-badge">
            ₹{item.price}{!sale && <small> / borrow</small>}
          </span>
        )}
        <TypeBadge type={item.listingType} className="item-type" />
      </div>

      <div className="item-info">
        <h4>{item.title}</h4>
        <p className="item-meta">🏫 {item.university || 'Campus'} • {item.category}</p>
        <button className="btn-view" onClick={(e) => { e.stopPropagation(); navigate(`/item/${item._id}`); }}>
          {sale ? 'View & buy' : 'View & borrow'}
        </button>
        {isAdmin && (
          <button
            className="item-admin-delete"
            onClick={async (e) => {
              e.stopPropagation();
              if (window.confirm('Delete this item (Admin)?')) {
                try {
                  await api.delete(`/admin/items/${item._id}`);
                  window.location.reload();
                } catch { alert('Failed to delete item.'); }
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
