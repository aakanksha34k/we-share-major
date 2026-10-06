// client/src/pages/LoginPage.jsx
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api from '../api';
import './LoginPage.css';
import './AuthShared.css';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const notice = location.state?.notice;

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // ProtectedRoute remembers where the person was going (e.g. a QR link) so we can send them back.
  const finishLogin = (response) => {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));

    const from = location.state?.from;
    navigate(typeof from === 'string' && from.startsWith('/') ? from : '/hub', { replace: true });
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setGoogleLoading(true);

    try {
      if (!credentialResponse?.credential) {
        throw new Error('Google did not return a credential.');
      }
      const response = await api.post('/auth/google', {
  credential: credentialResponse.credential,
  mode: 'login'
});
finishLogin(response);
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.response?.data?.message || 'Google login failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', formData);
      finishLogin(response);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <h1><Link to="/" className="auth-home-link">🔗 We Share</Link></h1>
          <h2>By students, for students.</h2>
          <p>Connect with peers across the city. Trade books, lab gear, and notes without the middleman.</p>
          <div className="login-stats">Join 5,000+ students in the network</div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-box">
          <p className="login-tag">— STUDENT-ONLY ACCESS</p>
          <h2>Student Login</h2>
          <p className="login-subtitle">Log in to access the peer resource network.</p>

          {notice && (
  <div
    className="login-error"
    style={{ background: '#e8f8f5', borderColor: '#55efc4', color: '#00664f' }}
    role="status"
  >
    {notice}
  </div>
)}
          {error && <div className="login-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="login-email">Gmail</label>
              <input
                id="login-email"
                type="email"
                name="email"
                placeholder="yourname@gmail.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <div className="password-label">
                <label htmlFor="login-password">Password</label>
                <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
              </div>

              <div className="password-input-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-login-submit" disabled={loading || googleLoading}>
              {loading ? 'Logging in...' : 'Log In to We Share →'}
            </button>
          </form>

          <div className="google-signup">
            <div className="or-divider"><span>or</span></div>

            {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google login failed. Please try again.')}
                useOneTap={false}
              />
            ) : (
              <p>Google Sign-In is currently unavailable.</p>
            )}

            {googleLoading && <p>Signing in with Google...</p>}
          </div>

          <div className="register-prompt">
            <p>Not part of the peer network yet?</p>
            <Link to="/register">
              <button type="button" className="btn-join">Join the Student Community</button>
            </Link>
          </div>

          <div className="login-footer-links">
            <Link to="/safety">Community Guidelines</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/contact">Student Support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
