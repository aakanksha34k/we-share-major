import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import './LoginPage.css';
import './AuthShared.css';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      navigate('/login', { replace: true, state: { notice: 'Password updated. Please sign in.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password.');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-left"><div className="login-brand">
        <h1><Link to="/" className="auth-home-link">🔗 We Share</Link></h1>
        <h2>Choose a new password</h2><p>Use at least 8 characters.</p>
      </div></div>
      <div className="login-right"><div className="login-form-box">
        <h2>New password</h2>
        {!token && <div className="login-error">This reset link is missing its token. <Link to="/forgot-password">Request a new one</Link>.</div>}
        {error && <div className="login-error" role="alert">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group"><label htmlFor="rp-1">New password</label>
            <input id="rp-1" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required /></div>
          <div className="form-group"><label htmlFor="rp-2">Confirm password</label>
            <input id="rp-2" type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required /></div>
          <button className="btn-login-submit" disabled={loading || !token}>{loading ? 'Saving…' : 'Update password'}</button>
        </form>
      </div></div>
    </div>
  );
}