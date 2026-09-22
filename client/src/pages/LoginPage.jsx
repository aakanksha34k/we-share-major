// client/src/pages/LoginPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { GoogleLogin } from '@react-oauth/google';
import './LoginPage.css';

function LoginPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const finishLogin = (response) => {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    navigate('/hub');
  };

  const resendVerification = async () => {
    if (!formData.email) return setError('Enter your Gmail address first.');
    setResendLoading(true); setError('');
    try {
      const response = await api.post('/auth/resend-verification', { email: formData.email });
      setError(response.data.message);
    } catch (err) { setError(err.response?.data?.message || 'Could not resend verification email.'); }
    finally { setResendLoading(false); }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(''); setGoogleLoading(true);
    try {
      const response = await api.post('/auth/google', { credential: credentialResponse.credential });
      finishLogin(response);
    } catch (err) {
      setError(err.response?.data?.message || 'Google login failed.');
    } finally { setGoogleLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post(
        '/auth/login',
        formData
      );

      finishLogin(response);

    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* Left Panel — Image/Branding */}
      <div className="login-left">
        <div className="login-brand">
          <h1>🔗 We Share</h1>
          <h2>By students, for students.</h2>
          <p>Connect with peers across the city. Trade books, lab gear, and notes without the middleman.</p>
          <div className="login-stats">
            Join 5,000+ students in the network
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="login-right">
        <div className="login-form-box">
          <p className="login-tag">— STUDENT-ONLY ACCESS</p>
          <h2>Student Login</h2>
          <p className="login-subtitle">Log in to access the peer resource network.</p>

          {/* Error message */}
          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Student Email or Username</label>
              <input
                type="text"
                name="email"
                placeholder="Enter your email or username"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <div className="password-label">
                <label>Password</label>
                <a href="#" className="forgot-link">Forgot password?</a>
              </div>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group keep-logged">
              <input type="checkbox" id="keepLogged" />
              <label htmlFor="keepLogged">Keep me logged in</label>
            </div>

            <button
              type="submit"
              className="btn-login-submit"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Log In to We Share →'}
            </button>
          </form>

          <div style={{ margin: '18px 0', textAlign: 'center' }}>
            <div style={{ marginBottom: 10 }}>or</div>
            {import.meta.env.VITE_GOOGLE_CLIENT_ID && <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Google login failed.')} useOneTap={false} />}
            {googleLoading && <p>Signing in with Google...</p>}
          </div>

          <div style={{ marginTop: 10, textAlign: 'right' }}>
            <button type="button" onClick={resendVerification} disabled={resendLoading} style={{ border: 0, background: 'transparent', textDecoration: 'underline', cursor: 'pointer' }}>
              {resendLoading ? 'Sending...' : 'Resend verification email'}
            </button>
          </div>

          <div className="register-prompt">
            <p>Not part of the peer network yet?</p>
            <Link to="/register">
              <button className="btn-join">Join the Student Community</button>
            </Link>
          </div>

          <div className="login-footer-links">
            <a href="#">Community Guidelines</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Student Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;