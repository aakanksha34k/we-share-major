// src/components/BorrowModal.jsx
import { useState } from 'react';
import api from '../api';
import './BorrowModal.css';
import PickupMap from './PickupMap';

function BorrowModal({ item, onClose, onSuccess }) {
  const [purpose, setPurpose] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get today's date for min date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minReturnDate = tomorrow.toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!purpose || !returnDate) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.post(
        '/borrow',
        {
          itemId: item._id,
          purpose,
          returnDate
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSuccess(response.data.borrowRequest);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <h2>Request to Borrow</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Item Info */}
        <div className="modal-item-info">
          <div className="modal-item-icon">📦</div>
          <div>
            <p className="modal-item-title">{item.title}</p>
            <p className="modal-item-meta">
              {item.condition} • {item.isFree ? 'Free' : `₹${item.price}`}
            </p>
          </div>
        </div>

        <div className="modal-form-group">
          <label>Fixed Price</label>
          <p><strong>{item.isFree ? 'FREE' : `₹${item.price}`}</strong> — this amount is fixed by the listing owner and is recorded on your request.</p>
          <label>Fixed Pickup Location</label>
          <p>{item.pickupLocation}</p>
          {item.pickupCoordinates?.latitude != null && <PickupMap value={item.pickupCoordinates} readOnly />}
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Purpose */}
          <div className="modal-form-group">
            <label>Purpose of Borrowing</label>
            <textarea
              placeholder="e.g. I'm preparing for the upcoming midterms and need this for practice problems."
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* Return Date */}
          <div className="modal-form-group">
            <label>Select Return Date</label>
            <input
              type="date"
              value={returnDate}
              onChange={e => setReturnDate(e.target.value)}
              min={minReturnDate}
              required
            />
          </div>

          {/* Borrowing Duration info */}
          <div className="modal-info">
            <p>📋 By sending this request, you agree to return the item in the same condition. The item owner will be notified and can approve or deny your request.</p>
          </div>

          {/* Buttons */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
            >
              Cancel Request
            </button>
            <button
              type="submit"
              className="btn-send"
              disabled={loading}
            >
              {loading ? 'Sending...' : '📤 Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BorrowModal;