// sell/StepTwo.jsx
import './Steps.css';
import PickupMap from '../PickupMap';

const locations = [
  { id: 'library', icon: '📚', name: 'Main University Library', desc: 'Open daily, well-lit, public space' },
  { id: 'union', icon: '🏛️', name: 'Student Union Building', desc: 'Central campus, near the main cafe' },
  { id: 'quad', icon: '🌿', name: 'Engineering Quad', desc: 'Outdoor seating, good for quick handoffs' },
  { id: 'custom', icon: '📍', name: 'Other / Custom Location', desc: 'Specify a different lab or campus building' },
];

function StepTwo({ formData, updateForm }) {
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentPhotos = formData.photos || [];
    const remaining = Math.max(0, 6 - currentPhotos.length);
    if (files.length > remaining) {
      alert(`You can upload up to 6 photos. Only the first ${remaining} selected file(s) will be added.`);
    }

    const selected = files.slice(0, remaining);
    const totalBytes = [...selected, ...(formData.photos || [])].reduce((sum, photo) => {
      if (typeof photo === 'string') return sum + Math.ceil((photo.length * 3) / 4);
      return sum + photo.size;
    }, 0);
    if (totalBytes > 20 * 1024 * 1024) {
      alert('Please keep the total photo payload under 20MB. Choose smaller images.');
      e.target.value = '';
      return;
    }
    try {
      const encoded = await Promise.all(selected.map(async (file) => {
        if (!file.type.startsWith('image/')) throw new Error('Only image files are allowed.');
        if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is larger than 10MB.`);
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
          reader.readAsDataURL(file);
        });
      }));
      updateForm({ photos: [...currentPhotos, ...encoded].slice(0, 6) });
    } catch (error) {
      alert(error.message);
    } finally {
      e.target.value = '';
    }
  };

  const removePhoto = (index) => {
    const newPhotos = [...(formData.photos || [])];
    newPhotos.splice(index, 1);
    updateForm({ photos: newPhotos });
  };

  return (
    <div className="step-container">
      <div className="step-main">
        <h2>Upload Photos & Set Location</h2>
        <p className="step-subtitle">Help buyers trust your listing with clear photos.</p>

        {/* Photo Upload */}
        <div className="form-group">
          <label>Item Photos</label>
          <div className="photo-upload-box" onClick={() => document.getElementById('photo-upload-input').click()} style={{ cursor: 'pointer' }}>
            <div className="photo-upload-icon">📷</div>
            <p>Click to select photos</p>
            <p className="photo-hint">Supports JPG, PNG, Max 10MB each</p>
            <input
              type="file"
              id="photo-upload-input"
              multiple
              accept="image/jpeg, image/png, image/webp"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />
            <button type="button" className="btn-browse-files" onClick={(event) => { event.stopPropagation(); document.getElementById('photo-upload-input').click(); }}>Browse Files</button>
          </div>
          <div className="photo-preview-row">
            {(formData.photos || []).map((photo, i) => (
              <div key={i} className="photo-slot has-photo" style={{ backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                <button type="button" className="btn-remove-photo" onClick={(event) => { event.stopPropagation(); removePhoto(i); }} style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', border: 'none', width: '20px', height: '20px', cursor: 'pointer' }}>×</button>
              </div>
            ))}
            {[...Array(Math.max(0, 6 - (formData.photos?.length || 0)))].map((_, i) => (
              <div key={`empty-${i}`} className="photo-slot" />
            ))}
          </div>
        </div>

        {/* Pickup Location */}
        <div className="form-group">
          <label>Preferred Exchange Location</label>
          <p className="form-hint">Select a safe, public spot on campus for the hand-off.</p>
          <div className="location-grid">
            {locations.map(loc => (
              <div
                key={loc.id}
                className={`location-card ${formData.pickupLocation === loc.name ? 'active' : ''}`}
                onClick={() => updateForm({ pickupLocation: loc.name })}
              >
                <span className="location-icon">{loc.icon}</span>
                <div>
                  <p className="location-name">{loc.name}</p>
                  <p className="location-desc">{loc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Pickup Map Location</label>
          <PickupMap
            value={formData.pickupCoordinates}
            onChange={(coords) => updateForm({ pickupCoordinates: coords })}
          />
          {formData.pickupCoordinates?.latitude == null && (
            <p className="form-hint">Please click the map to select the exact pickup point.</p>
          )}
        </div>

        <div className="form-group">
          <label>Detailed Instructions (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Meet me by the red benches next to the fountain..."
            value={formData.detailedLocation || ''}
            onChange={e => updateForm({ detailedLocation: e.target.value })}
          />
        </div>
      </div>

      {/* Tips */}
      <div className="step-tips">
        <h4>📸 Photo Tips</h4>
        <ul>
          <li>Upload up to 6 high quality photos</li>
          <li>Include angles showing any wear, serial numbers, or textbook editions</li>
          <li>Good lighting makes items sell faster</li>
        </ul>
        <div className="safe-trading">
          <h4>⚠️ Safety Tip</h4>
          <p>Always meet in well-lit, public areas on campus. Bring a friend if possible.</p>
        </div>
      </div>
    </div>
  );
}

export default StepTwo;