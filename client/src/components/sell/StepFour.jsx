// sell/StepFour.jsx
import './Steps.css';

function StepFour({ formData }) {
  return (
    <div className="step-container">
      <div className="step-main">
        <h2>Review Your Listing</h2>
        <p className="step-subtitle">Check everything before publishing!</p>

        <div className="review-card">
          {formData.photos && formData.photos.length > 0 ? (
            <div className="review-image" style={{ backgroundImage: `url(${formData.photos[0]})`, backgroundSize: 'cover', backgroundPosition: 'center', width: '100%', height: '200px', borderRadius: '12px 12px 0 0' }} />
          ) : (
            <div className="review-image-placeholder">📦</div>
          )}
          <div className="review-details">
            <div className="review-badges">
              <span className="review-badge new-listing">NEW LISTING</span>
              {formData.openToTrades && (
                <span className="review-badge open-trade">OPEN TO TRADE</span>
              )}
            </div>
            <h3>{formData.title || 'Your Item Title'}</h3>
            <p className="review-desc">{formData.description || 'Your description will appear here.'}</p>
            <div className="review-meta">
              <span>📂 {formData.category || 'Category'}</span>
              <span>⭐ {formData.condition || 'Condition'}</span>
              <span>📍 {formData.pickupLocation || 'Location'}</span>
            </div>
            <div className="review-price">
              {formData.isFree ? (
                <span className="price-free">FREE</span>
              ) : (
                <span className="price-tag">₹{formData.price || '0'}</span>
              )}
            </div>
          </div>
        </div>

        <div className="review-note">
          <p>🎉 Your post will appear to other students once published. You can edit or remove it anytime from your dashboard.</p>
        </div>
      </div>

      {/* Summary */}
      <div className="step-tips">
        <h4>📋 Quick Review</h4>
        <div className="review-summary">
          {[
            ['Category', formData.category],
            ['Condition', formData.condition],
            ['Price', formData.isFree ? 'Free' : `₹${formData.price}`],
            ['Pickup', formData.pickupLocation],
            ['Open to Trades', formData.openToTrades ? 'Yes' : 'No'],
          ].map(([label, value]) => (
            <div key={label} className="summary-row">
              <span className="summary-label">{label}</span>
              <span className="summary-value">{value || '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StepFour;