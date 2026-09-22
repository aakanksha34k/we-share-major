import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './AdminDashboard.css';

const API = '/admin';

// Dummy digital resources (matching DigitalDashboard.jsx)
const dummyDigitalResources = [
  { _id: 'dr1', title: 'Data Structures & Algorithms — Complete Notes', type: 'Notes', subject: 'Computer Science', uploader: 'Ankit S.', downloads: 342, status: 'approved' },
  { _id: 'dr2', title: 'Organic Chemistry Morrison & Boyd (PDF)', type: 'PDFs', subject: 'Chemistry', uploader: 'Priya M.', downloads: 189, status: 'approved' },
  { _id: 'dr3', title: 'Engineering Mathematics — Kreyszig 10th Ed', type: 'E-Books', subject: 'Mathematics', uploader: 'Rahul K.', downloads: 521, status: 'approved' },
  { _id: 'dr4', title: 'Physics PYQs 2020–2025 (Solved)', type: 'Question Papers', subject: 'Physics', uploader: 'Sneha T.', downloads: 410, status: 'pending' },
  { _id: 'dr5', title: 'Operating Systems — Galvin Notes + Diagrams', type: 'Notes', subject: 'Computer Science', uploader: 'Vikram D.', downloads: 278, status: 'approved' },
  { _id: 'dr6', title: 'Microeconomics Mankiw PDF (8th Edition)', type: 'PDFs', subject: 'Economics', uploader: 'Neha R.', downloads: 156, status: 'approved' },
  { _id: 'dr7', title: 'Digital Electronics — Morris Mano (E-Book)', type: 'E-Books', subject: 'Engineering', uploader: 'Arjun P.', downloads: 324, status: 'pending' },
  { _id: 'dr8', title: 'Biology Mid-Sem Question Papers 2024', type: 'Question Papers', subject: 'Biology', uploader: 'Meera J.', downloads: 97, status: 'approved' },
];

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [digitalResources] = useState(dummyDigitalResources);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [announcement, setAnnouncement] = useState('');
  const [announceSending, setAnnounceSending] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const getConfig = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));

        if (!token || user?.role !== 'admin') {
          navigate('/dashboard');
          return;
        }

        const config = getConfig();

        const [statsRes, usersRes, itemsRes, pendingRes, requestsRes, messagesRes] = await Promise.all([
          api.get(`${API}/stats`, config),
          api.get(`${API}/users`, config),
          api.get(`${API}/items`, config),
          api.get(`${API}/items/pending`, config),
          api.get(`${API}/requests`, config),
          api.get(`${API}/messages`, config),
        ]);

        setStats(statsRes.data);
        setAllUsers(usersRes.data);
        setAllItems(itemsRes.data);
        setPendingItems(pendingRes.data);
        setAllRequests(requestsRes.data);
        setAllMessages(messagesRes.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError('Failed to load admin dashboard.');
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [navigate]);

  // ── User Actions ──
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user and all their data?')) return;
    try {
      await api.delete(`${API}/users/${userId}`, getConfig());
      setAllUsers(allUsers.filter(u => u._id !== userId));
      if (stats) setStats({ ...stats, totalUsers: stats.totalUsers - 1 });
      showToast('User deleted successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  const handleToggleRole = async (userId) => {
    try {
      const { data } = await api.patch(`${API}/users/${userId}/role`, {}, getConfig());
      setAllUsers(allUsers.map(u => u._id === userId ? { ...u, role: data.user.role } : u));
      showToast(data.message);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change role', 'error');
    }
  };

  const handleToggleBan = async (userId) => {
    try {
      const { data } = await api.patch(`${API}/users/${userId}/ban`, {}, getConfig());
      setAllUsers(allUsers.map(u => u._id === userId ? { ...u, isBanned: data.user.isBanned } : u));
      showToast(data.message);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to toggle ban', 'error');
    }
  };

  // ── Item Actions ──
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Delete this item and its borrow requests?')) return;
    try {
      await api.delete(`${API}/items/${itemId}`, getConfig());
      setAllItems(allItems.filter(i => i._id !== itemId));
      setPendingItems(pendingItems.filter(i => i._id !== itemId));
      if (stats) setStats({ ...stats, totalItems: stats.totalItems - 1 });
      showToast('Item deleted successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete item', 'error');
    }
  };

  const handleUpdateItemStatus = async (itemId, status) => {
    try {
      await api.patch(`${API}/items/${itemId}/status`, { status }, getConfig());
      setPendingItems(pendingItems.filter(i => i._id !== itemId));
      setAllItems(allItems.map(i => i._id === itemId ? { ...i, status } : i));
      setSelectedItem(null);
      showToast(`Item ${status === 'available' ? 'approved' : 'rejected'} successfully`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  // ── Request Actions ──
  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm('Delete this borrow request?')) return;
    try {
      await api.delete(`${API}/requests/${requestId}`, getConfig());
      setAllRequests(allRequests.filter(r => r._id !== requestId));
      if (stats) setStats({ ...stats, totalBorrowRequests: stats.totalBorrowRequests - 1 });
      showToast('Request deleted successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete request', 'error');
    }
  };

  // ── Announcement ──
  const handleSendAnnouncement = async () => {
    if (!announcement.trim()) return;
    setAnnounceSending(true);
    try {
      const { data } = await api.post(`${API}/announce`, { message: announcement }, getConfig());
      showToast(data.message);
      setAnnouncement('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send announcement', 'error');
    }
    setAnnounceSending(false);
  };

  // ── Filtering helpers ──
  const filteredUsers = allUsers.filter(u =>
    u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredItems = allItems.filter(i => {
    const matchesSearch = i.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || i.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredRequests = allRequests.filter(r => {
    const matchesSearch = r.item?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.borrower?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || r.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredDigital = digitalResources.filter(r => {
    const matchesSearch = r.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || r.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // ── Sidebar config ──
  const sidebarTabs = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'physical', icon: '📦', label: 'Physical Items' },
    { id: 'digital', icon: '📄', label: 'Digital Resources' },
    { id: 'pending', icon: '⏳', label: 'Pending Approval' },
    { id: 'requests', icon: '🔄', label: 'Borrow Requests' },
    { id: 'messages', icon: '💬', label: 'Messages' },
    { id: 'announce', icon: '📢', label: 'Announcements' },
  ];

  if (loading) return (
    <div className="adm-loading">
      <div className="adm-loading-spinner"></div>
      <p>Loading Admin Dashboard...</p>
    </div>
  );

  if (error) return (
    <div className="adm-error">
      <span>⚠️</span>
      <p>{error}</p>
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  );

  return (
    <div className="adm-page">
      {/* Toast notification */}
      {toast && (
        <div className={`adm-toast adm-toast--${toast.type}`}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          {toast.message}
        </div>
      )}

      {/* Sidebar */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar-logo">🛡️ Admin Panel</div>

        <nav className="adm-sidebar-nav">
          {sidebarTabs.map(tab => (
            <button
              key={tab.id}
              className={`adm-sidebar-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(''); setFilterStatus('all'); }}
            >
              <span className="adm-sidebar-icon">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.id === 'pending' && pendingItems.length > 0 && (
                <span className="adm-sidebar-badge">{pendingItems.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="adm-sidebar-footer">
          <button className="adm-sidebar-back" onClick={() => navigate('/hub')}>← Back to Hub</button>
          <button className="adm-sidebar-logout" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      {/* Main */}
      <main className="adm-main">

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'overview' && (
          <div className="adm-tab-content">
            <div className="adm-page-header">
              <h1>Dashboard Overview</h1>
              <p>System health at a glance</p>
            </div>

            <div className="adm-stats-grid">
              {[
                { label: 'Total Users', value: stats?.totalUsers || 0, icon: '👥', color: '#3b82f6' },
                { label: 'Physical Items', value: stats?.totalItems || 0, icon: '📦', color: '#00b894' },
                { label: 'Digital Resources', value: digitalResources.length, icon: '📄', color: '#6c5ce7' },
                { label: 'Borrow Requests', value: stats?.totalBorrowRequests || 0, icon: '🔄', color: '#f39c12' },
                { label: 'Active Borrows', value: stats?.activeBorrows || 0, icon: '📋', color: '#e17055' },
                { label: 'Pending Approvals', value: stats?.pendingItems || 0, icon: '⏳', color: '#fdcb6e' },
                { label: 'Banned Users', value: stats?.bannedUsers || 0, icon: '🚫', color: '#d63031' },
                { label: 'Total Messages', value: stats?.totalMessages || 0, icon: '💬', color: '#0984e3' },
              ].map((s, i) => (
                <div key={i} className="adm-stat-card" style={{ '--stat-color': s.color }}>
                  <div className="adm-stat-icon">{s.icon}</div>
                  <div>
                    <p className="adm-stat-label">{s.label}</p>
                    <p className="adm-stat-value">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div className="adm-overview-grid">
              <div className="adm-card">
                <h3>Recent Users</h3>
                {stats?.recentUsers?.length > 0 ? (
                  <table className="adm-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
                    <tbody>
                      {stats.recentUsers.map(u => (
                        <tr key={u._id}>
                          <td className="adm-td-bold">{u.fullName}</td>
                          <td>{u.email}</td>
                          <td><span className={`adm-badge adm-badge--${u.role}`}>{u.role}</span></td>
                          <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="adm-empty">No recent users</p>}
              </div>

              <div className="adm-card">
                <h3>Recent Items</h3>
                {stats?.recentItems?.length > 0 ? (
                  <table className="adm-table">
                    <thead><tr><th>Item</th><th>Category</th><th>Owner</th><th>Status</th></tr></thead>
                    <tbody>
                      {stats.recentItems.map(it => (
                        <tr key={it._id}>
                          <td className="adm-td-bold">{it.title}</td>
                          <td>{it.category}</td>
                          <td>{it.owner?.fullName || 'Unknown'}</td>
                          <td><span className={`adm-badge adm-badge--${it.status}`}>{it.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="adm-empty">No recent items</p>}
              </div>
            </div>
          </div>
        )}

        {/* ═══ USERS TAB ═══ */}
        {activeTab === 'users' && (
          <div className="adm-tab-content">
            <div className="adm-page-header">
              <h1>User Management</h1>
              <p>{filteredUsers.length} users found</p>
            </div>

            <div className="adm-toolbar">
              <div className="adm-search">
                <span>🔍</span>
                <input placeholder="Search by name or email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>

            <div className="adm-card">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>College</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u._id}>
                      <td className="adm-td-bold">{u.fullName}</td>
                      <td>{u.email}</td>
                      <td>{u.college || '—'}</td>
                      <td><span className={`adm-badge adm-badge--${u.role}`}>{u.role}</span></td>
                      <td>
                        {u.isBanned ? (
                          <span className="adm-badge adm-badge--banned">Banned</span>
                        ) : (
                          <span className="adm-badge adm-badge--active">Active</span>
                        )}
                      </td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="adm-action-group">
                          {u.role !== 'admin' && (
                            <>
                              <button className="adm-btn adm-btn--promote" onClick={() => handleToggleRole(u._id)} title="Promote to Admin">👑</button>
                              <button className={`adm-btn ${u.isBanned ? 'adm-btn--unban' : 'adm-btn--ban'}`} onClick={() => handleToggleBan(u._id)} title={u.isBanned ? 'Unban' : 'Ban'}>
                                {u.isBanned ? '🔓' : '🔒'}
                              </button>
                              <button className="adm-btn adm-btn--delete" onClick={() => handleDeleteUser(u._id)} title="Delete">🗑️</button>
                            </>
                          )}
                          {u.role === 'admin' && u._id !== JSON.parse(localStorage.getItem('user'))?._id && (
                            <button className="adm-btn adm-btn--demote" onClick={() => handleToggleRole(u._id)} title="Demote to Student">⬇️</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <p className="adm-empty">No users match your search</p>}
            </div>
          </div>
        )}

        {/* ═══ PHYSICAL ITEMS TAB ═══ */}
        {activeTab === 'physical' && (
          <div className="adm-tab-content">
            <div className="adm-page-header">
              <h1>Physical Items</h1>
              <p>{filteredItems.length} items found</p>
            </div>

            <div className="adm-toolbar">
              <div className="adm-search">
                <span>🔍</span>
                <input placeholder="Search items..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <div className="adm-filter-pills">
                {['all', 'available', 'pending', 'lent', 'rejected'].map(s => (
                  <button key={s} className={`adm-pill ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="adm-card">
              <table className="adm-table">
                <thead>
                  <tr><th>Image</th><th>Title</th><th>Category</th><th>Condition</th><th>Price</th><th>Owner</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <tr key={item._id} className="adm-clickable" onClick={() => setSelectedItem(item)}>
                      <td>
                        {item.photos?.length > 0 ? (
                          <img src={item.photos[0]} alt="" className="adm-thumb" />
                        ) : (
                          <div className="adm-thumb-empty">📦</div>
                        )}
                      </td>
                      <td className="adm-td-bold">{item.title}</td>
                      <td>{item.category}</td>
                      <td>{item.condition}</td>
                      <td>{item.isFree ? <span className="adm-free">FREE</span> : `₹${item.price}`}</td>
                      <td>{item.owner?.fullName || 'Unknown'}</td>
                      <td><span className={`adm-badge adm-badge--${item.status}`}>{item.status}</span></td>
                      <td>
                        <div className="adm-action-group" onClick={e => e.stopPropagation()}>
                          {item.status === 'pending' && (
                            <>
                              <button className="adm-btn adm-btn--approve" onClick={() => handleUpdateItemStatus(item._id, 'available')}>✅</button>
                              <button className="adm-btn adm-btn--reject" onClick={() => handleUpdateItemStatus(item._id, 'rejected')}>❌</button>
                            </>
                          )}
                          <button className="adm-btn adm-btn--delete" onClick={() => handleDeleteItem(item._id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredItems.length === 0 && <p className="adm-empty">No items match your filters</p>}
            </div>
          </div>
        )}

        {/* ═══ DIGITAL RESOURCES TAB ═══ */}
        {activeTab === 'digital' && (
          <div className="adm-tab-content">
            <div className="adm-page-header">
              <h1>Digital Resources</h1>
              <p>{filteredDigital.length} resources found</p>
            </div>

            <div className="adm-toolbar">
              <div className="adm-search">
                <span>🔍</span>
                <input placeholder="Search resources..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <div className="adm-filter-pills">
                {['all', 'approved', 'pending'].map(s => (
                  <button key={s} className={`adm-pill ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="adm-card">
              <table className="adm-table">
                <thead>
                  <tr><th>Title</th><th>Type</th><th>Subject</th><th>Uploader</th><th>Downloads</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredDigital.map(r => (
                    <tr key={r._id}>
                      <td className="adm-td-bold">{r.title}</td>
                      <td><span className="adm-badge adm-badge--info">{r.type}</span></td>
                      <td>{r.subject}</td>
                      <td>{r.uploader}</td>
                      <td>⬇ {r.downloads}</td>
                      <td><span className={`adm-badge adm-badge--${r.status}`}>{r.status}</span></td>
                      <td>
                        <div className="adm-action-group">
                          {r.status === 'pending' && (
                            <>
                              <button className="adm-btn adm-btn--approve" title="Approve">✅</button>
                              <button className="adm-btn adm-btn--reject" title="Reject">❌</button>
                            </>
                          )}
                          <button className="adm-btn adm-btn--delete" title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredDigital.length === 0 && <p className="adm-empty">No resources match your filters</p>}
            </div>
          </div>
        )}

        {/* ═══ PENDING APPROVAL TAB ═══ */}
        {activeTab === 'pending' && (
          <div className="adm-tab-content">
            <div className="adm-page-header">
              <h1>Pending Approval</h1>
              <p>{pendingItems.length} items awaiting review</p>
            </div>

            {pendingItems.length > 0 ? (
              <div className="adm-pending-grid">
                {pendingItems.map(item => (
                  <div key={item._id} className="adm-pending-card" onClick={() => setSelectedItem(item)}>
                    <div className="adm-pending-preview">
                      {item.photos?.length > 0 ? (
                        <img src={item.photos[0]} alt="" />
                      ) : (
                        <div className="adm-pending-no-img">📦</div>
                      )}
                    </div>
                    <div className="adm-pending-body">
                      <h4>{item.title}</h4>
                      <p className="adm-pending-meta">{item.category} • {item.condition}</p>
                      <p className="adm-pending-meta">By {item.owner?.fullName || 'Unknown'}</p>
                      <p className="adm-pending-price">{item.isFree ? 'FREE' : `₹${item.price}`}</p>
                      <div className="adm-pending-actions">
                        <button className="adm-btn-lg adm-btn--approve" onClick={e => { e.stopPropagation(); handleUpdateItemStatus(item._id, 'available'); }}>
                          ✅ Approve
                        </button>
                        <button className="adm-btn-lg adm-btn--reject" onClick={e => { e.stopPropagation(); handleUpdateItemStatus(item._id, 'rejected'); }}>
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="adm-card">
                <p className="adm-empty">🎉 No items pending approval!</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ BORROW REQUESTS TAB ═══ */}
        {activeTab === 'requests' && (
          <div className="adm-tab-content">
            <div className="adm-page-header">
              <h1>Borrow Requests</h1>
              <p>{filteredRequests.length} requests found</p>
            </div>

            <div className="adm-toolbar">
              <div className="adm-search">
                <span>🔍</span>
                <input placeholder="Search by item or borrower..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <div className="adm-filter-pills">
                {['all', 'pending', 'approved', 'denied', 'returned', 'overdue'].map(s => (
                  <button key={s} className={`adm-pill ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="adm-card">
              <table className="adm-table">
                <thead>
                  <tr><th>Item</th><th>Borrower</th><th>Lender</th><th>Purpose</th><th>Return Date</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredRequests.map(req => (
                    <tr key={req._id}>
                      <td className="adm-td-bold">{req.item?.title || 'Unknown'}</td>
                      <td>{req.borrower?.fullName || 'Unknown'}</td>
                      <td>{req.lender?.fullName || 'Unknown'}</td>
                      <td className="adm-td-truncate" title={req.purpose}>{req.purpose}</td>
                      <td>{req.returnDate ? new Date(req.returnDate).toLocaleDateString() : '—'}</td>
                      <td><span className={`adm-badge adm-badge--${req.status}`}>{req.status}</span></td>
                      <td>
                        <div className="adm-action-group">
                          <button className="adm-btn adm-btn--delete" onClick={() => handleDeleteRequest(req._id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRequests.length === 0 && <p className="adm-empty">No requests match your filters</p>}
            </div>
          </div>
        )}

        {/* ═══ MESSAGES TAB ═══ */}
        {activeTab === 'messages' && (
          <div className="adm-tab-content">
            <div className="adm-page-header">
              <h1>Message Moderation</h1>
              <p>{allMessages.length} messages total (last 100 shown)</p>
            </div>

            <div className="adm-card">
              {allMessages.length > 0 ? (
                <table className="adm-table">
                  <thead>
                    <tr><th>From</th><th>To</th><th>Message</th><th>Read</th><th>Time</th></tr>
                  </thead>
                  <tbody>
                    {allMessages.map(m => (
                      <tr key={m._id}>
                        <td className="adm-td-bold">{m.sender?.fullName || 'Unknown'}</td>
                        <td>{m.receiver?.fullName || 'Unknown'}</td>
                        <td className="adm-td-truncate" title={m.content}>{m.content}</td>
                        <td>{m.read ? <span className="adm-badge adm-badge--active">Read</span> : <span className="adm-badge adm-badge--pending">Unread</span>}</td>
                        <td>{new Date(m.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="adm-empty">No messages found</p>
              )}
            </div>
          </div>
        )}

        {/* ═══ ANNOUNCEMENTS TAB ═══ */}
        {activeTab === 'announce' && (
          <div className="adm-tab-content">
            <div className="adm-page-header">
              <h1>Broadcast Announcement</h1>
              <p>Send a notification to all students on the platform</p>
            </div>

            <div className="adm-card adm-announce-card">
              <div className="adm-announce-icon">📢</div>
              <h3>Compose Announcement</h3>
              <p className="adm-announce-desc">This will create a notification for every student account. Use it for important updates, maintenance notices, or platform-wide messages.</p>
              <textarea
                className="adm-announce-input"
                placeholder="Type your announcement here..."
                rows={4}
                value={announcement}
                onChange={e => setAnnouncement(e.target.value)}
                maxLength={500}
              />
              <div className="adm-announce-footer">
                <span className="adm-announce-count">{announcement.length}/500</span>
                <button
                  className="adm-btn-primary"
                  disabled={!announcement.trim() || announceSending}
                  onClick={handleSendAnnouncement}
                >
                  {announceSending ? 'Sending...' : `📢 Send to ${stats?.totalUsers ? stats.totalUsers - 1 : 0} students`}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ═══ ITEM DETAIL MODAL ═══ */}
      {selectedItem && (
        <div className="adm-modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h2>Item Details</h2>
              <button className="adm-modal-close" onClick={() => setSelectedItem(null)}>✕</button>
            </div>

            <div className="adm-modal-body">
              {selectedItem.photos?.length > 0 && (
                <div className="adm-modal-image">
                  <img src={selectedItem.photos[0]} alt={selectedItem.title} />
                </div>
              )}
              <div className="adm-modal-details">
                <div className="adm-modal-row"><span>Title</span><strong>{selectedItem.title}</strong></div>
                <div className="adm-modal-row"><span>Description</span><p>{selectedItem.description || 'No description'}</p></div>
                <div className="adm-modal-row"><span>Category</span><p>{selectedItem.category}</p></div>
                <div className="adm-modal-row"><span>Condition</span><p>{selectedItem.condition}</p></div>
                <div className="adm-modal-row"><span>Price</span><p>{selectedItem.isFree ? 'Free' : `₹${selectedItem.price}`}</p></div>
                <div className="adm-modal-row"><span>Trades</span><p>{selectedItem.openToTrades ? 'Yes' : 'No'}</p></div>
                <div className="adm-modal-row"><span>Location</span><p>{selectedItem.pickupLocation || 'N/A'}</p></div>
                <div className="adm-modal-row"><span>Owner</span><p>{selectedItem.owner?.fullName || 'Unknown'}</p></div>
                <div className="adm-modal-row"><span>Status</span><span className={`adm-badge adm-badge--${selectedItem.status}`}>{selectedItem.status}</span></div>
              </div>
            </div>

            {selectedItem.status === 'pending' && (
              <div className="adm-modal-footer">
                <button className="adm-btn-lg adm-btn--reject" onClick={() => handleUpdateItemStatus(selectedItem._id, 'rejected')}>
                  ❌ Reject
                </button>
                <button className="adm-btn-lg adm-btn--approve" onClick={() => handleUpdateItemStatus(selectedItem._id, 'available')}>
                  ✅ Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
