import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import TypeBadge from '../components/TypeBadge';
import ComplaintModal, { CATEGORY_LABELS } from '../components/ComplaintModal';
import './AdminDashboard.css';

const API = '/admin';
const REQUEST_FILTERS = ['all', 'pending', 'payment_pending', 'handoff_pending', 'active', 'overdue', 'returned', 'completed', 'denied'];
const COMPLAINT_FILTERS = ['all', 'open', 'in_review', 'resolved', 'dismissed'];
const pretty = (s) => (s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()));

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [digitalResources, setDigitalResources] = useState([]);
  const [digitalTotal, setDigitalTotal] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaintBusy, setComplaintBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [announcement, setAnnouncement] = useState('');
  const [alsoEmail, setAlsoEmail] = useState(false);
  const [announceSending, setAnnounceSending] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!token || user?.role !== 'admin') {
          navigate('/dashboard');
          return;
        }

        const [statsRes, usersRes, itemsRes, pendingRes, requestsRes, messagesRes, complaintsRes, digitalRes] =
          await Promise.all([
            api.get(`${API}/stats`),
            api.get(`${API}/users`),
            api.get(`${API}/items`),
            api.get(`${API}/items/pending`),
            api.get(`${API}/requests`),
            api.get(`${API}/messages`),
            api.get('/complaints/admin/all'),
            api.get('/digital/admin/all')
          ]);

        setStats(statsRes.data);
        setAllUsers(usersRes.data);
        setAllItems(itemsRes.data);
        setPendingItems(pendingRes.data);
        setAllRequests(requestsRes.data);
        setAllMessages(messagesRes.data);
        setComplaints(complaintsRes.data);
        setDigitalResources(digitalRes.data);
        setDigitalTotal(digitalRes.data.length);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError('Failed to load admin dashboard.');
        setLoading(false);
      }
    };
    fetchAdminData();
  }, [navigate]);

  /* ── Users ── */
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user and all their data?')) return;
    try {
      await api.delete(`${API}/users/${userId}`);
      setAllUsers((list) => list.filter((u) => u._id !== userId));
      setStats((s) => (s ? { ...s, totalUsers: s.totalUsers - 1 } : s));
      showToast('User deleted successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  const handleToggleRole = async (userId) => {
    try {
      const { data } = await api.patch(`${API}/users/${userId}/role`);
      setAllUsers((list) => list.map((u) => (u._id === userId ? { ...u, role: data.user.role } : u)));
      showToast(data.message);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change role', 'error');
    }
  };

  const handleToggleBan = async (userId) => {
    try {
      const { data } = await api.patch(`${API}/users/${userId}/ban`);
      setAllUsers((list) => list.map((u) => (u._id === userId ? { ...u, isBanned: data.user.isBanned } : u)));
      // keep complaint views in sync
      setComplaints((list) => list.map((c) => (c.against?._id === userId ? { ...c, against: { ...c.against, isBanned: data.user.isBanned } } : c)));
      setSelectedComplaint((c) => (c && c.against?._id === userId ? { ...c, against: { ...c.against, isBanned: data.user.isBanned } } : c));
      showToast(data.message);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to toggle ban', 'error');
    }
  };

  /* ── Items ── */
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Delete this item and its borrow requests?')) return;
    try {
      await api.delete(`${API}/items/${itemId}`);
      setAllItems((list) => list.filter((i) => i._id !== itemId));
      setPendingItems((list) => list.filter((i) => i._id !== itemId));
      setStats((s) => (s ? { ...s, totalItems: s.totalItems - 1 } : s));
      showToast('Item deleted successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete item', 'error');
    }
  };

  const handleUpdateItemStatus = async (itemId, status) => {
    try {
      await api.patch(`${API}/items/${itemId}/status`, { status });
      setPendingItems((list) => list.filter((i) => i._id !== itemId));
      setAllItems((list) => list.map((i) => (i._id === itemId ? { ...i, status } : i)));
      setSelectedItem(null);
      showToast(`Item ${status === 'available' ? 'approved' : 'rejected'} successfully`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  /* ── Requests / digital ── */
  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm('Delete this request?')) return;
    try {
      await api.delete(`${API}/requests/${requestId}`);
      setAllRequests((list) => list.filter((r) => r._id !== requestId));
      setStats((s) => (s ? { ...s, totalBorrowRequests: s.totalBorrowRequests - 1 } : s));
      showToast('Request deleted successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete request', 'error');
    }
  };

  const handleDeleteDigital = async (id) => {
    if (!window.confirm('Delete this resource and its PDF file?')) return;
    try {
      await api.delete(`/digital/${id}`);
      setDigitalResources((list) => list.filter((r) => r._id !== id));
      setDigitalTotal((t) => Math.max(0, t - 1));
      showToast('Resource deleted successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete resource', 'error');
    }
  };

  /* ── Complaints ── */
  const submitComplaint = async (id, body) => {
    setComplaintBusy(true);
    try {
      const { data } = await api.patch(`/complaints/admin/${id}`, body);
      setComplaints((list) => list.map((c) => (c._id === id ? data.complaint : c)));
      setSelectedComplaint(null);

      let text = 'Complaint updated.';
      if (body.emailReporter) text += data.emailedReporter ? ' Email sent to the reporter.' : ' In-app reply sent, but the email could not be sent (check the server email settings).';
      showToast(text, body.emailReporter && !data.emailedReporter ? 'error' : 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update complaint', 'error');
    } finally {
      setComplaintBusy(false);
    }
  };

  /* ── Announcement ── */
  const handleSendAnnouncement = async () => {
    if (!announcement.trim()) return;
    setAnnounceSending(true);
    try {
      const { data } = await api.post(`${API}/announce`, { message: announcement, alsoEmail });
      showToast(data.message);
      setAnnouncement('');
      setAlsoEmail(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send announcement', 'error');
    }
    setAnnounceSending(false);
  };

  /* ── Filtering ── */
  const q = searchQuery.toLowerCase();
  const studentCount = allUsers.filter((u) => u.role !== 'admin' && !u.isBanned).length;
  const openComplaints = complaints.filter((c) => c.status === 'open' || c.status === 'in_review').length;

  const filteredUsers = allUsers.filter((u) => u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));

  const filteredItems = allItems.filter((i) => {
    const matchesSearch = i.title?.toLowerCase().includes(q);
    const matchesStatus = filterStatus === 'all' || i.status === filterStatus;
    const matchesType = typeFilter === 'all' || (typeFilter === 'sell' ? i.listingType === 'sell' : i.listingType !== 'sell');
    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredRequests = allRequests.filter((r) => {
    const matchesSearch = r.item?.title?.toLowerCase().includes(q) || r.borrower?.fullName?.toLowerCase().includes(q);
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesType = typeFilter === 'all' || (typeFilter === 'sell' ? r.type === 'purchase' : r.type !== 'purchase');
    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredDigital = digitalResources.filter((r) =>
    r.title?.toLowerCase().includes(q) || r.subject?.toLowerCase().includes(q) || r.uploader?.fullName?.toLowerCase().includes(q)
  );

  const filteredComplaints = complaints.filter((c) => {
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesSearch = !q ||
      c.reporter?.fullName?.toLowerCase().includes(q) ||
      c.against?.fullName?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const myId = JSON.parse(localStorage.getItem('user') || '{}')?.id;

  const sidebarTabs = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'physical', icon: '📦', label: 'Physical Items' },
    { id: 'digital', icon: '📄', label: 'Digital Resources' },
    { id: 'pending', icon: '⏳', label: 'Pending Approval' },
    { id: 'requests', icon: '🔄', label: 'Transactions' },
    { id: 'messages', icon: '💬', label: 'Messages' },
    { id: 'complaints', icon: '⚠️', label: 'Complaints' },
    { id: 'announce', icon: '📢', label: 'Announcements' },
  ];

  const typePills = (
    <div className="adm-filter-pills">
      {[['all', 'All types'], ['sell', '🏷️ For sale'], ['lend', '🔄 For lending']].map(([value, label]) => (
        <button key={value} className={`adm-pill ${typeFilter === value ? 'active' : ''}`} onClick={() => setTypeFilter(value)}>{label}</button>
      ))}
    </div>
  );

  if (loading) return (
    <div className="adm-loading"><div className="adm-loading-spinner"></div><p>Loading Admin Dashboard...</p></div>
  );

  if (error) return (
    <div className="adm-error"><span>⚠️</span><p>{error}</p><button onClick={() => window.location.reload()}>Retry</button></div>
  );

  return (
    <div className="adm-page">
      {toast && (
        <div className={`adm-toast adm-toast--${toast.type}`}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          {toast.message}
        </div>
      )}

      <aside className="adm-sidebar">
        <div className="adm-sidebar-logo">🛡️ Admin Panel</div>
        <nav className="adm-sidebar-nav">
          {sidebarTabs.map((tab) => (
            <button key={tab.id}
              className={`adm-sidebar-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(''); setFilterStatus('all'); setTypeFilter('all'); }}>
              <span className="adm-sidebar-icon">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.id === 'pending' && pendingItems.length > 0 && <span className="adm-sidebar-badge">{pendingItems.length}</span>}
              {tab.id === 'complaints' && openComplaints > 0 && <span className="adm-sidebar-badge">{openComplaints}</span>}
            </button>
          ))}
        </nav>
        <div className="adm-sidebar-footer">
          <button className="adm-sidebar-back" onClick={() => navigate('/hub')}>← Back to Hub</button>
          <button className="adm-sidebar-logout" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      <main className="adm-main">

        {/* ═══ OVERVIEW ═══ */}
        {activeTab === 'overview' && (
          <div className="adm-tab-content">
            <div className="adm-page-header"><h1>Dashboard Overview</h1><p>System health at a glance</p></div>

            <div className="adm-stats-grid">
              {[
                { label: 'Total Users', value: stats?.totalUsers || 0, icon: '👥', color: '#3b82f6' },
                { label: 'Physical Items', value: stats?.totalItems || 0, icon: '📦', color: '#00b894' },
                { label: 'Digital Resources', value: digitalTotal, icon: '📄', color: '#6c5ce7' },
                { label: 'Transactions', value: stats?.totalBorrowRequests || 0, icon: '🔄', color: '#f39c12' },
                { label: 'Active Borrows', value: stats?.activeBorrows || 0, icon: '📋', color: '#e17055' },
                { label: 'Pending Approvals', value: stats?.pendingItems || 0, icon: '⏳', color: '#fdcb6e' },
                { label: 'Open Complaints', value: stats?.openComplaints ?? openComplaints, icon: '⚠️', color: '#d63031' },
                { label: 'Banned Users', value: stats?.bannedUsers || 0, icon: '🚫', color: '#636e72' },
              ].map((s, i) => (
                <div key={i} className="adm-stat-card" style={{ '--stat-color': s.color }}>
                  <div className="adm-stat-icon">{s.icon}</div>
                  <div><p className="adm-stat-label">{s.label}</p><p className="adm-stat-value">{s.value}</p></div>
                </div>
              ))}
            </div>

            <div className="adm-overview-grid">
              <div className="adm-card">
                <h3>Recent Users</h3>
                {stats?.recentUsers?.length > 0 ? (
                  <table className="adm-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
                    <tbody>
                      {stats.recentUsers.map((u) => (
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
                    <thead><tr><th>Item</th><th>Type</th><th>Owner</th><th>Status</th></tr></thead>
                    <tbody>
                      {stats.recentItems.map((it) => (
                        <tr key={it._id}>
                          <td className="adm-td-bold">{it.title}</td>
                          <td><TypeBadge type={it.listingType} /></td>
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

        {/* ═══ USERS ═══ */}
        {activeTab === 'users' && (
          <div className="adm-tab-content">
            <div className="adm-page-header"><h1>User Management</h1><p>{filteredUsers.length} users found</p></div>
            <div className="adm-toolbar">
              <div className="adm-search"><span>🔍</span>
                <input placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="adm-card">
              <table className="adm-table">
                <thead><tr><th>Name</th><th>Email</th><th>College</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u._id}>
                      <td className="adm-td-bold">{u.fullName}</td>
                      <td>{u.email}</td>
                      <td>{u.college || '—'}</td>
                      <td><span className={`adm-badge adm-badge--${u.role}`}>{u.role}</span></td>
                      <td>{u.isBanned ? <span className="adm-badge adm-badge--banned">Banned</span> : <span className="adm-badge adm-badge--active">Active</span>}</td>
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
                          {u.role === 'admin' && u._id !== myId && (
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

        {/* ═══ PHYSICAL ITEMS ═══ */}
        {activeTab === 'physical' && (
          <div className="adm-tab-content">
            <div className="adm-page-header"><h1>Physical Items</h1><p>{filteredItems.length} items found</p></div>
            <div className="adm-toolbar">
              <div className="adm-search"><span>🔍</span>
                <input placeholder="Search items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="adm-filter-pills">
                {['all', 'available', 'pending', 'reserved', 'lent', 'sold', 'rejected', 'draft'].map((s) => (
                  <button key={s} className={`adm-pill ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>{pretty(s)}</button>
                ))}
              </div>
              {typePills}
            </div>
            <div className="adm-card">
              <table className="adm-table">
                <thead><tr><th>Image</th><th>Title</th><th>Type</th><th>Category</th><th>Condition</th><th>Price</th><th>Owner</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item._id} className="adm-clickable" onClick={() => setSelectedItem(item)}>
                      <td>{item.photos?.length > 0 ? <img src={item.photos[0]} alt="" className="adm-thumb" /> : <div className="adm-thumb-empty">📦</div>}</td>
                      <td className="adm-td-bold">{item.title}</td>
                      <td><TypeBadge type={item.listingType} /></td>
                      <td>{item.category}</td>
                      <td>{item.condition}</td>
                      <td>{item.isFree ? <span className="adm-free">FREE</span> : `₹${item.price}`}</td>
                      <td>{item.owner?.fullName || 'Unknown'}</td>
                      <td><span className={`adm-badge adm-badge--${item.status}`}>{item.status}</span></td>
                      <td>
                        <div className="adm-action-group" onClick={(e) => e.stopPropagation()}>
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

        {/* ═══ DIGITAL ═══ */}
        {activeTab === 'digital' && (
          <div className="adm-tab-content">
            <div className="adm-page-header"><h1>Digital Resources</h1><p>{filteredDigital.length} of {digitalTotal} resources shown</p></div>
            <div className="adm-toolbar">
              <div className="adm-search"><span>🔍</span>
                <input placeholder="Search by title, subject or uploader..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="adm-card">
              <table className="adm-table">
                <thead><tr><th>Title</th><th>Type</th><th>Subject</th><th>Uploader</th><th>Downloads</th><th>Uploaded</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredDigital.map((r) => (
                    <tr key={r._id}>
                      <td className="adm-td-bold adm-td-truncate" title={r.title}>{r.title}</td>
                      <td><span className="adm-badge adm-badge--info">{r.type}</span></td>
                      <td>{r.subject}</td>
                      <td>{r.uploader?.fullName || 'Deleted user'}</td>
                      <td>⬇ {r.downloads}</td>
                      <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td><div className="adm-action-group"><button className="adm-btn adm-btn--delete" title="Delete" onClick={() => handleDeleteDigital(r._id)}>🗑️</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredDigital.length === 0 && <p className="adm-empty">No resources match your search</p>}
            </div>
          </div>
        )}

        {/* ═══ PENDING ═══ */}
        {activeTab === 'pending' && (
          <div className="adm-tab-content">
            <div className="adm-page-header"><h1>Pending Approval</h1><p>{pendingItems.length} items awaiting review</p></div>
            {pendingItems.length > 0 ? (
              <div className="adm-pending-grid">
                {pendingItems.map((item) => (
                  <div key={item._id} className="adm-pending-card" onClick={() => setSelectedItem(item)}>
                    <div className="adm-pending-preview">
                      {item.photos?.length > 0 ? <img src={item.photos[0]} alt="" /> : <div className="adm-pending-no-img">📦</div>}
                    </div>
                    <div className="adm-pending-body">
                      <TypeBadge type={item.listingType} />
                      <h4>{item.title}</h4>
                      <p className="adm-pending-meta">{item.category} • {item.condition}</p>
                      <p className="adm-pending-meta">By {item.owner?.fullName || 'Unknown'}</p>
                      <p className="adm-pending-price">{item.isFree ? 'FREE' : `₹${item.price}${item.listingType === 'sell' ? '' : ' / borrow'}`}</p>
                      <div className="adm-pending-actions">
                        <button className="adm-btn-lg adm-btn--approve" onClick={(e) => { e.stopPropagation(); handleUpdateItemStatus(item._id, 'available'); }}>✅ Approve</button>
                        <button className="adm-btn-lg adm-btn--reject" onClick={(e) => { e.stopPropagation(); handleUpdateItemStatus(item._id, 'rejected'); }}>❌ Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="adm-card"><p className="adm-empty">🎉 No items pending approval!</p></div>
            )}
          </div>
        )}

        {/* ═══ TRANSACTIONS ═══ */}
        {activeTab === 'requests' && (
          <div className="adm-tab-content">
            <div className="adm-page-header"><h1>Transactions</h1><p>{filteredRequests.length} borrow and purchase requests found</p></div>
            <div className="adm-toolbar">
              <div className="adm-search"><span>🔍</span>
                <input placeholder="Search by item or borrower..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="adm-filter-pills">
                {REQUEST_FILTERS.map((s) => (
                  <button key={s} className={`adm-pill ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>{pretty(s)}</button>
                ))}
              </div>
              {typePills}
            </div>
            <div className="adm-card">
              <table className="adm-table">
                <thead><tr><th>Item</th><th>Type</th><th>Borrower / buyer</th><th>Owner</th><th>Price</th><th>Return / due</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredRequests.map((req) => (
                    <tr key={req._id}>
                      <td className="adm-td-bold">{req.item?.title || 'Unknown'}</td>
                      <td><TypeBadge type={req.type} /></td>
                      <td>{req.borrower?.fullName || 'Unknown'}</td>
                      <td>{req.lender?.fullName || 'Unknown'}</td>
                      <td>{req.basePrice > 0 ? `₹${req.basePrice}` : 'Free'}</td>
                      <td>
                        {req.type === 'purchase'
                          ? (req.status === 'payment_pending' && req.paymentDueAt ? `Pay by ${new Date(req.paymentDueAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` : '—')
                          : (req.returnDate ? new Date(req.returnDate).toLocaleDateString() : '—')}
                      </td>
                      <td><span className={`adm-badge adm-badge--${req.status}`}>{req.status.replace(/_/g, ' ')}</span></td>
                      <td><div className="adm-action-group"><button className="adm-btn adm-btn--delete" onClick={() => handleDeleteRequest(req._id)}>🗑️</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRequests.length === 0 && <p className="adm-empty">No requests match your filters</p>}
            </div>
          </div>
        )}

        {/* ═══ COMPLAINTS ═══ */}
        {activeTab === 'complaints' && (
          <div className="adm-tab-content">
            <div className="adm-page-header"><h1>Complaints</h1><p>{openComplaints} need attention · click a row to read it fully and reply</p></div>
            <div className="adm-toolbar">
              <div className="adm-search"><span>🔍</span>
                <input placeholder="Search by name or text..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="adm-filter-pills">
                {COMPLAINT_FILTERS.map((s) => (
                  <button key={s} className={`adm-pill ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>{pretty(s)}</button>
                ))}
              </div>
            </div>
            <div className="adm-card">
              <table className="adm-table">
                <thead><tr><th>Type</th><th>From</th><th>Against</th><th>Item</th><th>Details</th><th>Filed</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {filteredComplaints.map((c) => (
                    <tr key={c._id} className="adm-clickable" onClick={() => setSelectedComplaint(c)}>
                      <td className="adm-td-bold">{CATEGORY_LABELS[c.category] || c.category}</td>
                      <td>{c.reporter?.fullName || 'Deleted user'}</td>
                      <td>{c.against?.fullName || '—'}{c.against?.isBanned && ' (banned)'}</td>
                      <td>{c.borrowRequest?.item?.title || '—'}</td>
                      <td className="adm-td-truncate" title={c.description}>{c.description}</td>
                      <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td><span className={`cp-status cp-status--${c.status}`}>{c.status.replace('_', ' ')}</span></td>
                      <td><button className="cmp-open" onClick={() => setSelectedComplaint(c)}>Open</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredComplaints.length === 0 && <p className="adm-empty">No complaints</p>}
            </div>
          </div>
        )}

        {/* ═══ MESSAGES ═══ */}
        {activeTab === 'messages' && (
          <div className="adm-tab-content">
            <div className="adm-page-header"><h1>Message Moderation</h1><p>Last 100 messages shown</p></div>
            <div className="adm-card">
              {allMessages.length > 0 ? (
                <table className="adm-table">
                  <thead><tr><th>From</th><th>To</th><th>Message</th><th>Read</th><th>Time</th></tr></thead>
                  <tbody>
                    {allMessages.map((m) => (
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
              ) : <p className="adm-empty">No messages found</p>}
            </div>
          </div>
        )}

        {/* ═══ ANNOUNCEMENTS ═══ */}
        {activeTab === 'announce' && (
          <div className="adm-tab-content">
            <div className="adm-page-header"><h1>Broadcast Announcement</h1><p>Shows as a pop-up for every student, and in their notifications</p></div>
            <div className="adm-card adm-announce-card">
              <div className="adm-announce-icon">📢</div>
              <h3>Compose Announcement</h3>
              <p className="adm-announce-desc">Every student sees this as a pop-up the next time the app is open, until they press “Got it”. Use it for important updates, maintenance notices, or platform-wide messages.</p>
              <textarea className="adm-announce-input" placeholder="Type your announcement here..." rows={4}
                value={announcement} onChange={(e) => setAnnouncement(e.target.value)} maxLength={500} />
              <label className="cmp-check adm-announce-check">
                <input type="checkbox" checked={alsoEmail} onChange={(e) => setAlsoEmail(e.target.checked)} />
                Also send it by email (only for important news)
              </label>
              <div className="adm-announce-footer">
                <span className="adm-announce-count">{announcement.length}/500</span>
                <button className="adm-btn-primary" disabled={!announcement.trim() || announceSending} onClick={handleSendAnnouncement}>
                  {announceSending ? 'Sending...' : `📢 Send to ${studentCount} students`}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ═══ ITEM MODAL ═══ */}
      {selectedItem && (
        <div className="adm-modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h2>Item Details</h2>
              <button className="adm-modal-close" onClick={() => setSelectedItem(null)}>✕</button>
            </div>
            <div className="adm-modal-body">
              {selectedItem.photos?.length > 0 && (
                <div className="adm-modal-image"><img src={selectedItem.photos[0]} alt={selectedItem.title} /></div>
              )}
              <div className="adm-modal-details">
                <div className="adm-modal-row"><span>Title</span><strong>{selectedItem.title}</strong></div>
                <div className="adm-modal-row"><span>Type</span><TypeBadge type={selectedItem.listingType} /></div>
                <div className="adm-modal-row"><span>Description</span><p>{selectedItem.description || 'No description'}</p></div>
                <div className="adm-modal-row"><span>Category</span><p>{selectedItem.category}</p></div>
                <div className="adm-modal-row"><span>Condition</span><p>{selectedItem.condition}</p></div>
                <div className="adm-modal-row"><span>Price</span><p>{selectedItem.isFree ? 'Free' : `₹${selectedItem.price}${selectedItem.listingType === 'sell' ? ' (one-time sale)' : ' per borrow'}`}</p></div>
                <div className="adm-modal-row"><span>Location</span><p>{selectedItem.pickupLocation || 'N/A'}</p></div>
                <div className="adm-modal-row"><span>Owner</span><p>{selectedItem.owner?.fullName || 'Unknown'}</p></div>
                <div className="adm-modal-row"><span>Status</span><span className={`adm-badge adm-badge--${selectedItem.status}`}>{selectedItem.status}</span></div>
              </div>
            </div>
            {selectedItem.status === 'pending' && (
              <div className="adm-modal-footer">
                <button className="adm-btn-lg adm-btn--reject" onClick={() => handleUpdateItemStatus(selectedItem._id, 'rejected')}>❌ Reject</button>
                <button className="adm-btn-lg adm-btn--approve" onClick={() => handleUpdateItemStatus(selectedItem._id, 'available')}>✅ Approve</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ COMPLAINT MODAL ═══ */}
      {selectedComplaint && (
        <ComplaintModal
          key={selectedComplaint._id}
          complaint={selectedComplaint}
          busy={complaintBusy}
          onClose={() => setSelectedComplaint(null)}
          onSubmit={submitComplaint}
          onToggleBan={handleToggleBan}
        />
      )}
    </div>
  );
}

export default AdminDashboard;
