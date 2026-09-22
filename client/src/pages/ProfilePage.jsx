// client/src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import NotificationBell from '../components/NotificationBell';
import './ProfilePage.css';

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    college: '',
    major: '',
    graduationYear: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      setFormData({
        fullName: res.data.fullName || '',
        college: res.data.college || '',
        major: res.data.major || '',
        graduationYear: res.data.graduationYear || ''
      });
    } catch (err) {
      console.error(err);
      setMessage('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await api.put('/users/profile', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data.user);
      // Update local storage user just in case
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) return <div className="profile-loading">Loading Profile...</div>;
  if (!user) return <div className="profile-loading">Please log in to view.</div>;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-header-left">
          <button className="btn-back" onClick={() => navigate('/dashboard')}>← Back to Home</button>
          <h2>My Profile</h2>
        </div>
        <div className="profile-header-right">
          <NotificationBell />
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar-large">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <h3>{user.fullName}</h3>
          <p className="profile-email">{user.email}</p>
          <div className="profile-stats">
            <div className="stat">
              <span className="stat-val">{user.rating || 'New'}</span>
              <span className="stat-label">Rating</span>
            </div>
          </div>
        </div>

        <div className="profile-form-section">
          <h3>Edit Details</h3>
          {message && (
            <div className={`profile-message ${message.includes('success') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
          
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                name="fullName" 
                value={formData.fullName} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div className="form-group">
              <label>University / College</label>
              <input 
                type="text" 
                name="college" 
                value={formData.college} 
                onChange={handleChange} 
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Major</label>
                <input 
                  type="text" 
                  name="major" 
                  value={formData.major} 
                  onChange={handleChange} 
                />
              </div>
              <div className="form-group">
                <label>Graduation Year</label>
                <input 
                  type="number" 
                  name="graduationYear" 
                  value={formData.graduationYear} 
                  onChange={handleChange} 
                />
              </div>
            </div>
            <button type="submit" className="btn-save-profile" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
