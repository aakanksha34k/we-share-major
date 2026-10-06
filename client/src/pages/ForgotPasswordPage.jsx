import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import './LoginPage.css';
import './AuthShared.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setMsg(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMsg(data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-left"><div className="login-brand">
        <h1><Link to="/" className="auth-home-link">🔗 We Share</Link></h1>
        <h2>Forgot your password?</h2><p>We'll email you a link to set a new one.</p>
      </div></div>
      <div className="login-right"><div className="login-form-box">
        <h2>Reset password</h2>
        <p className="login-subtitle">Enter the Gmail you registered with.</p>
        {error && <div className="login-error" role="alert">{error}</div>}
        {msg && <div className="login-error" style={{ background: '#e8f8f5', borderColor: '#55efc4', color: '#00664f' }} role="status">{msg}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="fp-email">Gmail</label>
            <input id="fp-email" type="email" placeholder="yourname@gmail.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button className="btn-login-submit" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
        </form>
        <p className="login-link" style={{ marginTop: 20, textAlign: 'center' }}><Link to="/login" className="auth-text-link">← Back to login</Link></p>
      </div></div>
    </div>
  );
}