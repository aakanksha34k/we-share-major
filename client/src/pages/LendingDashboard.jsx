import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/StatusBadge';
import { formatDateTime, formatMoney, nextStep } from '../utils/borrowStatus';
import './LendingDashboard.css';

const asList = (data) => (Array.isArray(data) ? data : data?.requests || []);

// Statuses where the person is the one who has to do something next.
const needsAction = (role, status) => {
  if (role === 'lender') return ['pending', 'handoff_pending', 'active', 'overdue', 'late_fee_pending', 'late_fee_paid'].includes(status);
  return ['payment_pending', 'handoff_pending', 'active', 'overdue', 'late_fee_pending', 'late_fee_paid', 'return_pending'].includes(status);
};

function RequestCard({ req, role, onOpen, onDeny }) {
  const other = role === 'lender' ? req.borrower : req.lender;
  const photo = req.item?.photos?.[0];

  return (
    <article className="ld-card">
      <div className="ld-thumb">{photo ? <img src={photo} alt="" /> : <span>📦</span>}</div>

      <div className="ld-info">
        <div className="ld-title-row">
          <h3>{req.item?.title || 'Item removed'}</h3>
          <StatusBadge status={req.status} />
        </div>
        <p className="ld-meta">
          {role === 'lender' ? 'From' : 'Owner'}: <strong>{other?.fullName || 'Unknown'}</strong>
          {' · '}{formatMoney(req.basePrice)}
        </p>
        <p className="ld-meta">
          {req.selectedHandoffAt
            ? `Handoff ${formatDateTime(req.selectedHandoffAt)}`
            : '3 handoff times proposed'}
          {' · '}Return {formatDateTime(req.returnDate)}
        </p>
        <p className={`ld-next ${needsAction(role, req.status) ? 'is-action' : ''}`}>
          {nextStep(role === 'lender' ? 'lender' : 'borrower', req)}
        </p>
      </div>

      <div className="ld-actions">
        <button className="ld-btn ld-btn--primary" onClick={() => onOpen(req._id)}>
          {role === 'lender' && req.status === 'pending' ? 'Review request' : 'Open transaction'}
        </button>
        {role === 'lender' && req.status === 'pending' && (
          <button className="ld-btn ld-btn--danger" onClick={() => onDeny(req._id)}>Deny</button>
        )}
      </div>
    </article>
  );
}

function LendingDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('myItems');
  const [items, setItems] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (activeTab === 'myItems') {
          const res = await api.get('/items/user/my-items');
          if (!cancelled) setItems(res.data);
        } else if (activeTab === 'incoming') {
          const res = await api.get('/borrow/incoming');
          if (!cancelled) setIncoming(asList(res.data));
        } else {
          const res = await api.get('/borrow/my-requests');
          if (!cancelled) setMine(asList(res.data));
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [activeTab, reloadKey]);

  const deny = async (requestId) => {
    if (!window.confirm('Deny this borrow request?')) return;
    try {
      await api.put(`/borrow/${requestId}/deny`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not deny the request.');
    }
  };

  const open = (requestId) => navigate(`/borrow/${requestId}`);

  const tabs = [
    { id: 'myItems', label: 'My listings' },
    { id: 'incoming', label: 'Incoming requests' },
    { id: 'myRequests', label: 'My borrow requests' }
  ];

  return (
    <div className="ld-page">
      <header className="ld-header">
        <button className="ld-link" onClick={() => navigate('/dashboard')}>← Back to marketplace</button>
        <h1>My dashboard</h1>
        <button className="ld-btn ld-btn--primary ld-header-cta" onClick={() => navigate('/sell')}>
          + List an item
        </button>
      </header>

      <div className="ld-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`ld-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="ld-content">
        {loading && <p className="ld-state">Loading…</p>}
        {error && <p className="ld-state ld-state--error">{error}</p>}

        {!loading && !error && activeTab === 'myItems' && (
          <>
            {items.length === 0 && (
              <div className="ld-state">
                <p>You haven’t listed anything yet.</p>
                <button className="ld-btn ld-btn--primary" onClick={() => navigate('/sell')}>List your first item</button>
              </div>
            )}
            {items.map((item) => (
              <article key={item._id} className="ld-card">
                <div className="ld-thumb">{item.photos?.[0] ? <img src={item.photos[0]} alt="" /> : <span>📦</span>}</div>
                <div className="ld-info">
                  <div className="ld-title-row">
                    <h3>{item.title || 'Untitled draft'}</h3>
                    <StatusBadge status={item.status} kind="item" />
                  </div>
                  <p className="ld-meta">{formatMoney(item.isFree ? 0 : item.price)} · {item.category || 'No category yet'}</p>
                  <p className="ld-meta">📍 {item.pickupLocation || 'No pickup location yet'}</p>
                </div>
                <div className="ld-actions">
                  {item.status === 'draft' ? (
                    <button className="ld-btn ld-btn--primary" onClick={() => navigate(`/sell/${item._id}`)}>Continue editing</button>
                  ) : (
                    <button className="ld-btn ld-btn--ghost" onClick={() => navigate(`/item/${item._id}`)}>View</button>
                  )}
                </div>
              </article>
            ))}
          </>
        )}

        {!loading && !error && activeTab === 'incoming' && (
          <>
            {incoming.length === 0 && <p className="ld-state">No one has requested your items yet.</p>}
            {incoming.map((req) => (
              <RequestCard key={req._id} req={req} role="lender" onOpen={open} onDeny={deny} />
            ))}
          </>
        )}

        {!loading && !error && activeTab === 'myRequests' && (
          <>
            {mine.length === 0 && (
              <div className="ld-state">
                <p>You haven’t requested anything yet.</p>
                <button className="ld-btn ld-btn--primary" onClick={() => navigate('/dashboard')}>Browse the marketplace</button>
              </div>
            )}
            {mine.map((req) => (
              <RequestCard key={req._id} req={req} role="borrower" onOpen={open} onDeny={deny} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default LendingDashboard;
