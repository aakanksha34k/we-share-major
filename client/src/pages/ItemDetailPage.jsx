import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import BorrowModal from '../components/BorrowModal';
import PickupMap from '../components/PickupMap';
import TypeBadge from '../components/TypeBadge';
import './ItemDetailPage.css';

function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await api.get(`/items/${id}`);
        setItem(response.data);
      } catch (err) {
        console.error('Failed to fetch item:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  if (loading) return <div className="detail-loading">Loading...</div>;
  if (!item) return <div className="detail-loading">Item not found</div>;

  const isOwner = currentUser.id === item.owner?._id;
  const isSale = item.listingType === 'sell';

  return (
    <div className="item-detail-page">
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
        <span className="detail-logo">🔗 We Share</span>
      </div>

      <div className="detail-content">
        <div className="detail-left">
          <div className="detail-image">
            {item.photos && item.photos.length > 0 ? (
              <img src={item.photos[0]} alt={item.title} />
            ) : (
              <div className="detail-image-placeholder">📦</div>
            )}
          </div>
          <div className="detail-badges">
            <TypeBadge type={item.listingType} />
            <span className={`badge condition ${(item.condition || '').toLowerCase()}`}>{item.condition}</span>
            {item.isFree && <span className="badge free">FREE</span>}
          </div>
        </div>

        <div className="detail-right">
          <p className="detail-category">📂 {item.category}</p>
          <h1>{item.title}</h1>

          <div className="detail-price">
            {item.isFree ? (
              <span className="price-free">FREE</span>
            ) : (
              <span className="price-amount">₹{item.price}{!isSale && <small className="price-unit"> per borrow</small>}</span>
            )}
          </div>

          <p className={`detail-type-note detail-type-note--${isSale ? 'sell' : 'lend'}`}>
            {isSale
              ? 'This item is for sale. Once you pay and collect it, it is yours. After the owner approves, you get about 2 days to pay.'
              : 'This item is for lending. You return it by the agreed time; late returns cost a daily fee.'}
          </p>

          <div className="detail-owner">
            <div className="owner-avatar">{item.owner?.fullName?.charAt(0).toUpperCase()}</div>
            <div>
              <p className="owner-name">{item.owner?.fullName || 'Unknown User'}</p>
              <p className="owner-college">{item.owner?.college || 'Student'}</p>
            </div>
            <div className="owner-rating">⭐ {item.owner?.rating || 'New'}</div>
          </div>

          <div className="detail-description">
            <h3>Description</h3>
            <p>{item.description}</p>
          </div>

          {item.pickupCoordinates?.latitude != null && (
            <div style={{ margin: '20px 0' }}>
              <h3>Pickup Map</h3>
              <PickupMap value={item.pickupCoordinates} readOnly />
            </div>
          )}

          <div className="detail-info-grid">
            <div className="info-item">
              <span className="info-label">📍 Pickup Location</span>
              <span className="info-value">{item.pickupLocation || 'To be discussed'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">🏫 University</span>
              <span className="info-value">{item.university || 'Not specified'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">📅 Listed On</span>
              <span className="info-value">{new Date(item.createdAt).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="info-item">
              <span className="info-label">📦 Status</span>
              <span className="info-value">{item.status}</span>
            </div>
          </div>

          {!isOwner && item.status === 'available' && (
            <div className="detail-actions">
              <button className="btn-borrow" onClick={() => setShowModal(true)}>
                {isSale ? '🛒 Buy this item' : '📋 Request to Borrow'}
              </button>
              <button className="btn-message" onClick={() => navigate(`/messages/${item.owner._id}`)}>
                💬 Message {isSale ? 'Seller' : 'Owner'}
              </button>
            </div>
          )}

          {isOwner && (
            <div className="detail-actions">
              <button className="btn-edit" onClick={() => navigate(`/sell/${item._id}`)}>✏️ Edit Listing</button>
            </div>
          )}

          {currentUser.role === 'admin' && (
            <div className="detail-actions" style={{ marginTop: '10px' }}>
              <button
                className="btn-edit"
                style={{ backgroundColor: 'red', color: 'white', width: '100%' }}
                onClick={async () => {
                  if (window.confirm('Are you sure you want to delete this item?')) {
                    try {
                      await api.delete(`/admin/items/${item._id}`);
                      navigate('/dashboard');
                    } catch {
                      alert('Failed to delete item.');
                    }
                  }
                }}
              >
                🗑️ Delete Item (Admin)
              </button>
            </div>
          )}

          {item.status === 'lent' && <div className="detail-unavailable">⚠️ This item is currently lent out and not available.</div>}
          {item.status === 'reserved' && <div className="detail-unavailable">⏳ This item is reserved for another student.</div>}
          {item.status === 'sold' && <div className="detail-unavailable">This item has been sold.</div>}
        </div>
      </div>

      {showModal && (
        <BorrowModal
          item={item}
          onClose={() => setShowModal(false)}
          onSuccess={(request) => {
            setShowModal(false);
            navigate(`/borrow/${request._id}`);
          }}
        />
      )}
    </div>
  );
}

export default ItemDetailPage;
