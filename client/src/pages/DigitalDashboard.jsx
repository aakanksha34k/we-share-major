// client/src/pages/DigitalDashboard.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import DigitalUploadModal, { formatSize } from '../components/DigitalUploadModal';
import './DigitalDashboard.css';
import './DigitalExtras.css';

const PAGE_SIZE = 24;

// Display-only config. The actual resources and counts always come from the API.
const CATEGORIES = [
  { icon: '📁', name: 'All Resources', color: '#6c5ce7', bg: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' },
  { icon: '📝', name: 'Notes', color: '#00b894', bg: 'linear-gradient(135deg, #00b894, #55efc4)' },
  { icon: '📖', name: 'E-Books', color: '#0984e3', bg: 'linear-gradient(135deg, #0984e3, #74b9ff)' },
  { icon: '📋', name: 'Question Papers', color: '#fdcb6e', bg: 'linear-gradient(135deg, #f39c12, #fdcb6e)' },
  { icon: '📂', name: 'Other', color: '#636e72', bg: 'linear-gradient(135deg, #636e72, #b2bec3)' }
];

const typeIcons = {
  Notes: '📝',
  'E-Books': '📖',
  'Question Papers': '📋',
  Other: '📂'
};

const typePreviewClass = {
  Notes: 'digital-card-preview--notes',
  'E-Books': 'digital-card-preview--ebook',
  'Question Papers': 'digital-card-preview--paper',
  Other: 'digital-card-preview--other'
};

const fileSafe = (title) => (title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'resource').slice(0, 80);

function DigitalDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [view, setView] = useState('all'); // 'all' | 'mine'
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('downloads'); // 'downloads' | 'newest'

  const [resources, setResources] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const [counts, setCounts] = useState({});
  const [countsTotal, setCountsTotal] = useState(0);

  const [showUpload, setShowUpload] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [notice, setNotice] = useState(null);

  const requestRef = useRef(0);
  const noticeTimer = useRef(null);

  const notify = (message, type = 'success') => {
    clearTimeout(noticeTimer.current);
    setNotice({ message, type });
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  };

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  /* ---------------- counts for the category cards ---------------- */

  const fetchCounts = useCallback(async () => {
    try {
      const { data } = await api.get('/digital/stats');
      setCounts(data.counts || {});
      setCountsTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load resource counts:', err);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  /* ---------------- list ---------------- */

  const fetchPage = useCallback(
    async (pageNumber, append) => {
      const requestId = ++requestRef.current; // ignore out-of-order responses
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError('');

      try {
        const params = { page: pageNumber, limit: PAGE_SIZE, sort };
        if (selectedCategory && selectedCategory !== 'All Resources') params.type = selectedCategory;
        if (search.trim()) params.search = search.trim();
        if (view === 'mine') params.mine = true;

        const { data } = await api.get('/digital', { params });
        if (requestId !== requestRef.current) return;

        setResources((previous) => {
          if (!append) return data.resources;
          const seen = new Set(previous.map((r) => r._id));
          return [...previous, ...data.resources.filter((r) => !seen.has(r._id))];
        });
        setPage(data.page);
        setPages(data.pages);
        setTotal(data.total);
      } catch (err) {
        if (requestId !== requestRef.current) return;
        const message = err.response?.data?.message || 'Unable to load resources. Please try again.';
        if (append) notify(message, 'error');
        else {
          setResources([]);
          setError(message);
        }
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [selectedCategory, search, sort, view]
  );

  useEffect(() => {
    if (!selectedCategory) return;
    const timer = setTimeout(() => fetchPage(1, false), 250);
    return () => clearTimeout(timer);
  }, [selectedCategory, fetchPage]);

  /* ---------------- actions ---------------- */

  const openCategory = (name) => {
    setSelectedCategory(name);
    setView('all');
    setSearch('');
  };

  const backToCategories = () => {
    setSelectedCategory(null);
    setView('all');
    setSearch('');
  };

  const showMyUploads = () => {
    setSelectedCategory('All Resources');
    setView('mine');
    setSearch('');
  };

  const handleUploaded = (resource, message) => {
    setShowUpload(false);
    notify(message || 'Uploaded.');
    fetchCounts();
    // Take the uploader to their own uploads so they can see it landed.
    setSelectedCategory('All Resources');
    setView('mine');
    setSearch('');
    setSort('newest');
  };

  const handleDownload = async (resource) => {
    if (downloadingId) return;
    setDownloadingId(resource._id);

    try {
      const response = await api.get(`/digital/${resource._id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileSafe(resource.title)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      setResources((previous) =>
        previous.map((r) => (r._id === resource._id ? { ...r, downloads: (r.downloads || 0) + 1 } : r))
      );
    } catch (err) {
      // With responseType 'blob', error bodies also arrive as a Blob.
      let message = 'Download failed. Please try again.';
      try {
        if (err.response?.data instanceof Blob) {
          message = JSON.parse(await err.response.data.text()).message || message;
        }
      } catch {
        /* keep the default message */
      }
      notify(message, 'error');
      if (err.response?.status === 404) fetchPage(1, false);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (resource) => {
    if (!window.confirm(`Delete "${resource.title}"? The PDF will be removed for everyone.`)) return;

    try {
      await api.delete(`/digital/${resource._id}`);
      setResources((previous) => previous.filter((r) => r._id !== resource._id));
      setTotal((t) => Math.max(0, t - 1));
      fetchCounts();
      notify('Resource deleted.');
    } catch (err) {
      notify(err.response?.data?.message || 'Could not delete the resource.', 'error');
    }
  };

  const canDelete = (resource) =>
    user.role === 'admin' || String(resource.uploader?._id) === String(user.id);

  /* ---------------- render ---------------- */

  const heading = view === 'mine' ? 'My uploads' : selectedCategory;

  return (
    <div className="digital-dashboard digital-dashboard--no-sidebar">
      {notice && (
        <div className={`dd-toast dd-toast--${notice.type}`} role="status">
          {notice.message}
        </div>
      )}

      <div className="digital-main">
        {/* Top Bar */}
        <div className="digital-topbar">
          <div className="digital-topbar-left-brand">
            <span className="digital-dashboard-logo">📄 Digital Hub</span>
          </div>

          <div className="digital-topbar-right">
            <button className="btn-hub" onClick={() => navigate('/hub')}>← Hub</button>
            <button className="btn-hub" onClick={showMyUploads}>My Uploads</button>
            <button className="btn-upload" onClick={() => setShowUpload(true)}>+ Upload PDF</button>
            <div
              className="digital-user-avatar"
              onClick={() => navigate('/profile')}
              title="View Profile"
            >
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </div>

        {/* Category selection */}
        {!selectedCategory && (
          <div className="digi-category-center-view">
            <div className="digi-category-center-header">
              <h1>📄 Digital Library</h1>
              <p>Free notes, e-books and past papers shared by students. Download any PDF in one tap.</p>
            </div>
            <div className="digi-category-center-grid">
              {CATEGORIES.map((cat, index) => {
                const count = cat.name === 'All Resources' ? countsTotal : counts[cat.name] || 0;
                return (
                  <div
                    key={cat.name}
                    className="digi-category-center-card"
                    style={{ '--dcat-bg': cat.bg, '--dcat-color': cat.color, animationDelay: `${index * 0.08}s` }}
                    onClick={() => openCategory(cat.name)}
                  >
                    <div className="digi-category-center-icon">{cat.icon}</div>
                    <h3 className="digi-category-center-name">{cat.name}</h3>
                    <span className="digi-category-center-count">
                      {count} {count === 1 ? 'resource' : 'resources'}
                    </span>
                    <div className="digi-category-center-arrow">→</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Resources */}
        {selectedCategory && (
          <>
            <div className="digi-pills-bar">
              <button className="digi-back-btn" onClick={backToCategories}>← Categories</button>
              <div className="digi-pills">
                {CATEGORIES.map((cat) => (
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
                  placeholder="Search by title, subject or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="digital-feed-header">
              <div>
                <h2>{heading}</h2>
                <p>
                  {loading
                    ? 'Loading...'
                    : `${total} ${total === 1 ? 'resource' : 'resources'}${view === 'mine' ? ' uploaded by you' : ' shared by students'}`}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="dd-toggle" role="group" aria-label="Show">
                  <button className={view === 'all' ? 'is-active' : ''} onClick={() => setView('all')}>
                    Everyone
                  </button>
                  <button className={view === 'mine' ? 'is-active' : ''} onClick={() => setView('mine')}>
                    My uploads
                  </button>
                </div>
                <div className="digital-sort">
                  <button
                    className={`digital-sort-btn ${sort === 'downloads' ? 'active' : ''}`}
                    onClick={() => setSort('downloads')}
                  >
                    Most Downloaded
                  </button>
                  <button
                    className={`digital-sort-btn ${sort === 'newest' ? 'active' : ''}`}
                    onClick={() => setSort('newest')}
                  >
                    Newest
                  </button>
                </div>
              </div>
            </div>

            <div className="digital-grid">
              {loading && <div className="dd-state"><p>Loading resources…</p></div>}

              {!loading && error && (
                <div className="dd-state dd-state--error">
                  <p>{error}</p>
                  <button className="dd-btn dd-btn--ghost" onClick={() => fetchPage(1, false)}>Try again</button>
                </div>
              )}

              {!loading && !error && resources.length === 0 && (
                <div className="dd-state">
                  <p>
                    {search.trim()
                      ? `No resources match "${search.trim()}". Try a different word, or upload it yourself.`
                      : view === 'mine'
                        ? 'You haven’t uploaded anything yet. Share your notes or a past paper to help the next batch.'
                        : 'Nothing here yet. Be the first to upload a PDF in this category.'}
                  </p>
                  <button className="btn-upload" onClick={() => setShowUpload(true)}>+ Upload PDF</button>
                </div>
              )}

              {!loading && !error && resources.map((r) => (
                <div key={r._id} className="digital-card">
                  <div className={`digital-card-preview ${typePreviewClass[r.type] || 'digital-card-preview--other'}`}>
                    <span>{typeIcons[r.type] || '📂'}</span>
                    <span className="digital-card-type-badge">{r.type}</span>
                  </div>

                  <div className="digital-card-body">
                    <h3 className="digital-card-title" title={r.title}>{r.title}</h3>
                    <span className="digital-card-subject">{r.subject}</span>
                    {r.description && <p className="digital-card-desc">{r.description}</p>}

                    <div className="digital-card-meta">
                      <span>🏫 {r.university || r.uploader?.college || 'Not specified'}</span>
                    </div>
                    <p className="dd-card-meta">
                      PDF, {formatSize(r.fileSize)}, added {new Date(r.createdAt).toLocaleDateString('en-IN')}
                    </p>

                    <div className="digital-card-footer">
                      <div className="digital-card-uploader">
                        <span className="digital-card-uploader-avatar">
                          {(r.uploader?.fullName || 'S').charAt(0).toUpperCase()}
                        </span>
                        <span>{r.uploader?.fullName || 'Student'}</span>
                      </div>
                      <div className="digital-card-downloads" title="Downloads">⬇ {r.downloads || 0}</div>
                    </div>

                    <div className="dd-card-actions">
                      <button
                        className="dd-download"
                        onClick={() => handleDownload(r)}
                        disabled={downloadingId === r._id}
                      >
                        {downloadingId === r._id ? 'Downloading…' : '⬇ Download PDF'}
                      </button>
                      {canDelete(r) && (
                        <button
                          className="dd-delete"
                          onClick={() => handleDelete(r)}
                          title="Delete this resource"
                          aria-label={`Delete ${r.title}`}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!loading && !error && page < pages && (
              <button className="dd-more" onClick={() => fetchPage(page + 1, true)} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>

      {showUpload && (
        <DigitalUploadModal
          defaultType={selectedCategory && selectedCategory !== 'All Resources' ? selectedCategory : 'Notes'}
          onClose={() => setShowUpload(false)}
          onUploaded={handleUploaded}
        />
      )}
    </div>
  );
}

export default DigitalDashboard;
