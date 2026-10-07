// sell/StepThree.jsx
import './Steps.css';

function StepThree({ formData, updateForm }) {
  return (
    <div className="step-container">
      <div className="form-group">
  <label>What do you want to do with this item?</label>
  <div className="condition-buttons">
    <button type="button" className={`condition-btn ${formData.listingType !== 'sell' ? 'active' : ''}`}
      onClick={() => updateForm({ listingType: 'lend' })}>Lend it (returned later)</button>
    <button type="button" className={`condition-btn ${formData.listingType === 'sell' ? 'active' : ''}`}
      onClick={() => updateForm({ listingType: 'sell', isFree: false })}>Sell it (one-time)</button>
  </div>
  <p className="form-hint">
    {formData.listingType === 'sell'
      ? 'The buyer pays the full price and keeps the item. No return, no late fees.'
      : 'The borrower pays your price, returns the item, and pays a late fee if overdue.'}
  </p>
</div>
      <div className="step-main">
        <h2>Pricing & Final Review</h2>
        <p className="step-subtitle">Set your price and exchange preferences.</p>

        {/* Price Input */}
        
        <div className="form-group">
          <label>{formData.listingType === 'sell' ? 'Selling price' : 'Price per borrow'}</label>
          <div className="price-input-box">
            <span className="price-symbol">₹</span>
            <input
              type="number"
              placeholder="0.00"
              value={formData.price}
              onChange={e => updateForm({ price: e.target.value })}
              disabled={formData.isFree}
              min="0"
            />
          </div>
        </div>

        {/* Free Toggle */}
        <div className="form-group toggle-group">
          {formData.listingType !== 'sell' && ( <div>
            <label>Give away for free</label>
            <p className="form-hint">Item will be listed as FREE</p>
          </div> )}
          <div
            className={`toggle ${formData.isFree ? 'on' : ''}`}
            onClick={() => updateForm({ isFree: !formData.isFree, price: 0 })}
          />
        </div>


        {/* Pricing Tip */}
        <div className="pricing-tip">
          <span>💡</span>
          <p>Items priced between Rs.100–Rs.500 sell 60% faster on campus. Consider offering a student discount for faster trades!</p>
        </div>
      </div>

      {/* Tips */}
      <div className="step-tips">
        <h4>💰 Pricing Tips</h4>
        <ul>
          <li>Check Amazon and eBay for reference prices</li>
          <li>Condition matters — used items should be 40-60% of original price</li>
          <li>Free items get 3x more inquiries</li>
        </ul>
      </div>
    </div>
  );
}

export default StepThree;