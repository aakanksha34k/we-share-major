import './Steps.css';

function StepThree({ formData, updateForm }) {
  const selling = formData.listingType === 'sell';
  return (
    <div className="step-container">
      <div className="step-main">
        <h2>Pricing</h2>
        <p className="step-subtitle">Decide how you want to share this item.</p>

        <div className="form-group">
          <label>What do you want to do with this item?</label>
          <div className="condition-buttons">
            <button type="button" className={`condition-btn ${!selling ? 'active' : ''}`}
              onClick={() => updateForm({ listingType: 'lend' })}>Lend it (returned later)</button>
            <button type="button" className={`condition-btn ${selling ? 'active' : ''}`}
              onClick={() => updateForm({ listingType: 'sell', isFree: false })}>Sell it (one-time)</button>
          </div>
          <p className="form-hint" style={{ marginTop: 8 }}>
            {selling
              ? 'The buyer pays the full price and keeps the item. No return, no late fees.'
              : 'The borrower pays your price, returns the item, and pays a late fee if overdue.'}
          </p>
        </div>

        <div className="form-group">
          <label>{selling ? 'Selling price' : 'Price per borrow'}</label>
          <div className="price-input-box">
            <span className="price-symbol">₹</span>
            <input type="number" placeholder="0" min="0" value={formData.price}
              disabled={formData.isFree}
              onChange={(e) => updateForm({ price: e.target.value })} />
          </div>
        </div>

        {!selling && (
          <div className="form-group toggle-group">
            <div>
              <label>Give away for free</label>
              <p className="form-hint">Item will be listed as FREE</p>
            </div>
            <div className={`toggle ${formData.isFree ? 'on' : ''}`}
              onClick={() => updateForm({ isFree: !formData.isFree, price: formData.isFree ? '' : 0 })} />
          </div>
        )}

        <div className="pricing-tip">
          <span>💡</span>
          <p>Students respond best to fair prices. Used books at 40–60% of the original price move fastest. Free items get the most requests.</p>
        </div>
      </div>

      <div className="step-tips">
        <h4>💰 Pricing Tips</h4>
        <ul>
          <li>Check Amazon or Flipkart for the reference price</li>
          <li>Condition matters: used items should be 40–60% of new</li>
          <li>Lending? A small fee covers wear and tear</li>
        </ul>
      </div>
    </div>
  );
}

export default StepThree;