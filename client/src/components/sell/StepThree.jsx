// sell/StepThree.jsx
import './Steps.css';

function StepThree({ formData, updateForm }) {
  return (
    <div className="step-container">
      <div className="step-main">
        <h2>Pricing & Final Review</h2>
        <p className="step-subtitle">Set your price and exchange preferences.</p>

        {/* Price Input */}
        <div className="form-group">
          <label>Set your price</label>
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
          <div>
            <label>Give away for free</label>
            <p className="form-hint">Item will be listed as FREE</p>
          </div>
          <div
            className={`toggle ${formData.isFree ? 'on' : ''}`}
            onClick={() => updateForm({ isFree: !formData.isFree, price: 0 })}
          />
        </div>

        {/* Open to Trades Toggle */}
        <div className="form-group toggle-group">
          <div>
            <label>Open to Trades</label>
            <p className="form-hint">Willing to swap for other textbooks or equipment</p>
          </div>
          <div
            className={`toggle ${formData.openToTrades ? 'on' : ''}`}
            onClick={() => updateForm({ openToTrades: !formData.openToTrades })}
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
          <li>Open to trades increases your chances of a deal</li>
        </ul>
      </div>
    </div>
  );
}

export default StepThree;