import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './LendingDashboard.css';

function LendingDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('myItems');
  const [items, setItems] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      if (activeTab === 'myItems') setItems((await api.get('/items/user/my-items')).data);
      if (activeTab === 'incomingRequests') setIncomingRequests((await api.get('/borrow/incoming')).data);
      if (activeTab === 'myRequests') setMyRequests((await api.get('/borrow/my-requests')).data);
    } catch (err) { setError(err.response?.data?.message || 'Failed to fetch data'); }
    finally { setLoading(false); }
  };

  const handleAction = async (requestId, action) => {
    try {
      if (action === 'approve') await api.put(`/borrow/${requestId}/approve`);
      if (action === 'deny') await api.put(`/borrow/${requestId}/deny`);
      await fetchData();
    } catch (err) { alert(err.response?.data?.message || 'Action failed.'); }
  };

  const statusLabel = (status) => status.replaceAll('_', ' ');

  return (
    <div className="lending-dashboard">
      <div className="ld-header">
        <button className="btn-back" onClick={() => navigate('/dashboard')}>← Back to Marketplace</button>
        <h1>Lending Dashboard</h1>
      </div>
      <div className="ld-tabs">
        <button className={`tab-btn ${activeTab === 'myItems' ? 'active' : ''}`} onClick={() => setActiveTab('myItems')}>My Listings</button>
        <button className={`tab-btn ${activeTab === 'incomingRequests' ? 'active' : ''}`} onClick={() => setActiveTab('incomingRequests')}>Incoming Requests</button>
        <button className={`tab-btn ${activeTab === 'myRequests' ? 'active' : ''}`} onClick={() => setActiveTab('myRequests')}>My Borrow Requests</button>
      </div>
      <div className="ld-content">
        {loading && <div className="ld-loading">Loading...</div>}
        {error && <div className="ld-error">{error}</div>}

        {!loading && !error && activeTab === 'myItems' && <div className="items-list">
          {items.length === 0 && <p className="ld-empty">You haven't listed any items yet.</p>}
          {items.map(item => <div key={item._id} className="ld-card"><div className="ld-card-info"><h3>{item.title}</h3><p>Status: <span className={`status-badge ${item.status}`}>{statusLabel(item.status)}</span></p><p>Price: {item.isFree ? 'Free' : `₹${item.price}`}</p><p>Pickup: {item.pickupLocation}</p></div><div className="ld-card-actions"><button className="btn-edit" onClick={() => navigate(`/item/${item._id}`)}>View</button></div></div>)}
        </div>}

        {!loading && !error && activeTab === 'incomingRequests' && <div className="requests-list">
          {incomingRequests.length === 0 && <p className="ld-empty">No incoming requests right now.</p>}
          {incomingRequests.map(req => <div key={req._id} className="ld-card"><div className="ld-card-info"><h3>{req.item?.title}</h3><p>From: {req.borrower?.fullName}</p><p>Purpose: {req.purpose}</p><p>Fixed price: {req.basePrice === 0 ? 'FREE' : `₹${req.basePrice}`}</p><p>Return: {new Date(req.returnDate).toLocaleDateString('en-IN')}</p><p>Status: <span className={`status-badge ${req.status}`}>{statusLabel(req.status)}</span></p></div><div className="ld-card-actions">{req.status === 'pending' && <><button className="btn-approve" onClick={() => handleAction(req._id, 'approve')}>Approve</button><button className="btn-deny" onClick={() => handleAction(req._id, 'deny')}>Deny</button></>}{req.status !== 'pending' && <button className="btn-edit" onClick={() => navigate(`/borrow/${req._id}`)}>Open Transaction</button>}</div></div>)}
        </div>}

        {!loading && !error && activeTab === 'myRequests' && <div className="requests-list">
          {myRequests.length === 0 && <p className="ld-empty">You haven't made any requests.</p>}
          {myRequests.map(req => <div key={req._id} className="ld-card"><div className="ld-card-info"><h3>{req.item?.title}</h3><p>Owner: {req.lender?.fullName}</p><p>Fixed price: {req.basePrice === 0 ? 'FREE' : `₹${req.basePrice}`}</p><p>Pickup: {req.pickupLocation?.label}</p><p>Return: {new Date(req.returnDate).toLocaleDateString('en-IN')}</p><p>Status: <span className={`status-badge ${req.status}`}>{statusLabel(req.status)}</span></p>{req.lateFeeAmount > 0 && <p>Current late fee: ₹{req.lateFeeAmount}</p>}</div><div className="ld-card-actions"><button className="btn-edit" onClick={() => navigate(`/borrow/${req._id}`)}>Open Transaction</button></div></div>)}
        </div>}
      </div>
    </div>
  );
}
export default LendingDashboard;
