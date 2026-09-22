// client/src/pages/DigitalDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DigitalDashboard.css';

const digitalCategories = [
  { icon: '📁', name: 'All Resources', color: '#6c5ce7', bg: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' },
  { icon: '📝', name: 'Notes', color: '#00b894', bg: 'linear-gradient(135deg, #00b894, #55efc4)' },
  { icon: '📕', name: 'PDFs', color: '#e17055', bg: 'linear-gradient(135deg, #e17055, #fab1a0)' },
  { icon: '📖', name: 'E-Books', color: '#0984e3', bg: 'linear-gradient(135deg, #0984e3, #74b9ff)' },
  { icon: '📋', name: 'Question Papers', color: '#fdcb6e', bg: 'linear-gradient(135deg, #f39c12, #fdcb6e)' },
  { icon: '📂', name: 'Other', color: '#636e72', bg: 'linear-gradient(135deg, #636e72, #b2bec3)' },
];

// Dummy digital resources for initial display
const dummyResources = [
  {
    _id: 'd1',
    title: 'Data Structures & Algorithms — Complete Notes',
    type: 'Notes',
    subject: 'Computer Science',
    uploader: 'Ankit S.',
    downloads: 342,
    price: 0,
    university: 'State University',
  },
  {
    _id: 'd2',
    title: 'Organic Chemistry Morrison & Boyd (PDF)',
    type: 'PDFs',
    subject: 'Chemistry',
    uploader: 'Priya M.',
    downloads: 189,
    price: 0,
    university: 'City Tech',
  },
  {
    _id: 'd3',
    title: 'Engineering Mathematics — Kreyszig 10th Ed',
    type: 'E-Books',
    subject: 'Mathematics',
    uploader: 'Rahul K.',
    downloads: 521,
    price: 50,
    university: 'State University',
  },
  {
    _id: 'd4',
    title: 'Physics PYQs 2020–2025 (Solved)',
    type: 'Question Papers',
    subject: 'Physics',
    uploader: 'Sneha T.',
    downloads: 410,
    price: 0,
    university: 'Arts College',
  },
  {
    _id: 'd5',
    title: 'Operating Systems — Galvin Notes + Diagrams',
    type: 'Notes',
    subject: 'Computer Science',
    uploader: 'Vikram D.',
    downloads: 278,
    price: 0,
    university: 'City Tech',
  },
  {
    _id: 'd6',
    title: 'Microeconomics Mankiw PDF (8th Edition)',
    type: 'PDFs',
    subject: 'Economics',
    uploader: 'Neha R.',
    downloads: 156,
    price: 30,
    university: 'State University',
  },
  {
    _id: 'd7',
    title: 'Digital Electronics — Morris Mano (E-Book)',
    type: 'E-Books',
    subject: 'Engineering',
    uploader: 'Arjun P.',
    downloads: 324,
    price: 0,
    university: 'City Tech',
  },
  {
    _id: 'd8',
    title: 'Biology Mid-Sem Question Papers 2024',
    type: 'Question Papers',
    subject: 'Biology',
    uploader: 'Meera J.',
    downloads: 97,
    price: 0,
    university: 'Med School',
  },
];

const typeIcons = {
  'Notes': '📝',
  'PDFs': '📕',
  'E-Books': '📖',
  'Question Papers': '📋',
  'Other': '📂',
};

const typePreviewClass = {
  'Notes': 'digital-card-preview--notes',
  'PDFs': 'digital-card-preview--pdf',
  'E-Books': 'digital-card-preview--ebook',
  'Question Papers': 'digital-card-preview--paper',
  'Other': 'digital-card-preview--other',
};

function DigitalDashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [resources] = useState(dummyResources);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  // Filter resources by search and category
  const filteredResources = resources.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All Resources' || item.type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCategoryClick = (catName) => {
    setSelectedCategory(catName);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSearch('');
  };

  return (
    <div className="digital-dashboard digital-dashboard--no-sidebar">

      {/* Main Content */}
      <div className="digital-main">

        {/* Top Bar */}
        <div className="digital-topbar">
          <div className="digital-topbar-left-brand">
            <span className="digital-dashboard-logo">📄 Digital Hub</span>
          </div>

          <div className="digital-topbar-right">
            <button className="btn-hub" onClick={() => navigate('/hub')}>
              ← Hub
            </button>
            <button className="btn-upload" onClick={() => alert('Upload feature coming soon!')}>
              + Upload Resource
            </button>
            <div
              className="digital-user-avatar"
              onClick={() => navigate('/profile')}
              title="View Profile"
            >
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </div>

        {/* Category Selection View (shown when no category is selected) */}
        {!selectedCategory && (
          <div className="digi-category-center-view">
            <div className="digi-category-center-header">
              <h1>📄 Digital Library</h1>
              <p>Choose a resource type to explore study materials shared by fellow students</p>
            </div>
            <div className="digi-category-center-grid">
              {digitalCategories.map((cat, index) => (
                <div
                  key={cat.name}
                  className="digi-category-center-card"
                  style={{ '--dcat-bg': cat.bg, '--dcat-color': cat.color, animationDelay: `${index * 0.08}s` }}
                  onClick={() => handleCategoryClick(cat.name)}
                >
                  <div className="digi-category-center-icon">{cat.icon}</div>
                  <h3 className="digi-category-center-name">{cat.name}</h3>
                  <span className="digi-category-center-count">
                    {cat.name === 'All Resources'
                      ? `${resources.length} resources`
                      : `${resources.filter(r => r.type === cat.name).length} resources`}
                  </span>
                  <div className="digi-category-center-arrow">→</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resources View (shown after a category is selected) */}
        {selectedCategory && (
          <>
            {/* Category Pills Bar */}
            <div className="digi-pills-bar">
              <button className="digi-back-btn" onClick={handleBackToCategories}>
                ← Categories
              </button>
              <div className="digi-pills">
                {digitalCategories.map(cat => (
                  <button
                    key={cat.name}
                    className={`digi-pill ${selectedCategory === cat.name ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.name)}
                  >
                    <span>{cat.icon}</span> {cat.name}
                  </button>
                ))}
              </div>
              <div className="digital-search-bar">
                <span className="digital-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search for notes, PDFs, e-books..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Feed Header */}
            <div className="digital-feed-header">
              <div>
                <h2>{selectedCategory}</h2>
                <p>Showing {filteredResources.length} resources shared by students</p>
              </div>
              <div className="digital-sort">
                <button className="digital-sort-btn active">Most Downloaded</button>
                <button className="digital-sort-btn">Newest</button>
                <button className="digital-sort-btn">Subject</button>
              </div>
            </div>

            {/* Resources Grid */}
            <div className="digital-grid">
              {filteredResources.length > 0 ? (
                filteredResources.map(item => (
                  <div key={item._id} className="digital-card">
                    <div className={`digital-card-preview ${typePreviewClass[item.type] || 'digital-card-preview--other'}`}>
                      <span>{typeIcons[item.type] || '📂'}</span>
                      <span className="digital-card-type-badge">{item.type}</span>
                    </div>
                    <div className="digital-card-body">
                      <h3 className="digital-card-title">{item.title}</h3>
                      <span className="digital-card-subject">{item.subject}</span>
                      <div className="digital-card-meta">
                        <span>🏫 {item.university}</span>
                      </div>
                      <div className="digital-card-footer">
                        <div className="digital-card-uploader">
                          <span className="digital-card-uploader-avatar">
                            {item.uploader.charAt(0)}
                          </span>
                          <span>{item.uploader}</span>
                        </div>
                        <div className="digital-card-downloads">
                          ⬇ {item.downloads}
                        </div>
                        {item.price === 0 ? (
                          <span className="digital-card-free">FREE</span>
                        ) : (
                          <span className="digital-card-price">₹{item.price}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="digital-no-items">
                  <p>😕 No resources found{search ? ` for "${search}"` : ''}</p>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default DigitalDashboard;
