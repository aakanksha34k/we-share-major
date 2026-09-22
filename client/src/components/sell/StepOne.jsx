// sell/StepOne.jsx
import './Steps.css';

const categories = ['Books', 'Stationery', 'Lab Gear', 'Electronics', 'Other'];
const conditions = ['New', 'Good', 'Used'];

function StepOne({ formData, updateForm }) {
  return (
    <div className="step-container">
      <div className="step-main">
        <h2>Item Details</h2>
        <p className="step-subtitle">Let's start with the basics. Be as descriptive as possible.</p>

        <div className="form-group">
          <label>Item Title</label>
          <input
            type="text"
            placeholder="e.g. Organic Chemistry 9th Edition - McMurry"
            value={formData.title}
            onChange={e => updateForm({ title: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Category</label>
          <select
            value={formData.category}
            onChange={e => updateForm({ category: e.target.value })}
          >
            <option value="">Select a category</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Condition</label>
          <div className="condition-buttons">
            {conditions.map(cond => (
              <button
                key={cond}
                type="button"
                className={`condition-btn ${formData.condition === cond ? 'active' : ''}`}
                onClick={() => updateForm({ condition: cond })}
              >
                {cond}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            placeholder="Describe the item's features, any defects, and what's included..."
            value={formData.description}
            onChange={e => updateForm({ description: e.target.value })}
            rows={5}
          />
        </div>
      </div>

      {/* Tips Panel */}
      <div className="step-tips">
        <h4>✅ Tips for a Quick Sale</h4>
        <ul>
          <li>Be specific with book editions and ISBN numbers</li>
          <li>Mention any highlighting or notes inside the pages</li>
          <li>For lab kits, list all included components</li>
          <li>Specify if you're open to trades for other academic resources</li>
        </ul>
        <div className="safe-trading">
          <h4>🛡️ Safe Trading</h4>
          <p>Always meet in safe, public areas on campus like the library or student union.</p>
        </div>
      </div>
    </div>
  );
}

export default StepOne;