import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState('Verifying your email...');
  const [error, setError] = useState('');
  useEffect(() => {
    const token = params.get('token');
    if (!token) { setError('Verification token is missing.'); return; }
    api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(res => setMessage(res.data.message))
      .catch(err => { setError(err.response?.data?.message || 'Verification failed.'); setMessage(''); });
  }, [params]);
  return <div style={{ padding: 50, textAlign: 'center' }}><h1>🔗 We Share</h1>{message && <p>{message}</p>}{error && <p style={{ color: 'crimson' }}>{error}</p>}<Link to="/login">Go to Login</Link></div>;
}
