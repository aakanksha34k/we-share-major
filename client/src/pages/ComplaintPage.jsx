import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { formatDateTime } from '../utils/borrowStatus';
import './ComplaintPage.css';

const CATEGORIES = [
  ['not_returned', 'Item was not returned'],
  ['item_damaged', 'Item returned damaged'],
  ['not_as_described', 'Item not as described'],
  ['no_show', 'Person did not show up'],
  ['payment_issue', 'Payment problem'],
  ['harassment', 'Harassment or abuse'],
  ['other', 'Something else']
];
const asList = (d) => (Array.isArray(d) ? d : d?.requests || []);

export default function ComplaintPage() {
  const [params] = useSearchParams();
  const me = JSON.parse(localStorage.getItem('user') || '{}');
  const preRequest = params.get('request');
  const preUser = params.get('user');

  const [deals, setDeals] = useState([]);
  const [mine, setMine] = useState([]);
  const [target, setTarget] = useState(preRequest ? `req:${preRequest}` : preUser ? `user:${preUser}` : '');
  const [category, setCategory] = useState(preRequest ? 'not_returned' : 'other');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [a, b, c] = await Promise.all([api.get('/borrow/my-requests'), api.get('/borrow/incoming'), api.get('/complaints/mine')]);
      const list = [...asList(a.data).map((r) => ({ r, role: 'borrower' })), ...asList(b.data).map((r) => ({ r, role: 'lender' }))];
      setDeals(list);
      setMine(c.data);
    } catch { /* ignore */ }
  };
  useEffect(() => { load(); }, []);

  const options = useMemo(() => deals.map(({ r, role }) => {
    const other = role === 'borrower' ? r.lender : r.borrower;
    return { value: `req:${r._id}`, label: `${r.item?.title || 'Item'} — with ${other?.fullName || 'user'} (you are the ${role === 'borrower' ? 'borrower' : 'owner'})` };
  }), [deals]);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    const payload = { category, description };
    if (target.startsWith('req:')) payload.requestId = target.slice(4);
    if (target.startsWith('user:')) payload.againstId = target.slice(5);
    if (!target && category !== 'other') return setError('Pick the transaction this is about.');
    setBusy(true);
    try {
      const { data } = await api.post('/complaints', payload);
      setMessage(data.message);
      setDescription('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit.');
    } finally { setBusy(false); }
  };

  return (
    <div className="cp-page">
      <h1>Report a problem</h1>
      <p className="cp-sub">Pick the transaction and we tag the other person automatically. You never need their ID.</p>

      <form className="cp-card" onSubmit={submit}>
        <label>About which transaction?</label>
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">General / not about a transaction</option>
          {preUser && !options.some((o) => o.value === target) && <option value={`user:${preUser}`}>The person I was chatting with</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <label>What happened?</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <label>Details</label>
        <textarea rows={5} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Include dates, what was agreed, and anything the admin should know." />

        {error && <div className="cp-alert cp-alert--err" role="alert">{error}</div>}
        {message && <div className="cp-alert cp-alert--ok" role="status">{message}</div>}
        <button className="cp-btn" disabled={busy}>{busy ? 'Sending…' : 'Submit complaint'}</button>
      </form>

      <h2>My complaints</h2>
      {mine.length === 0 && <p className="cp-sub">None yet.</p>}
      {mine.map((c) => (
        <div className="cp-card" key={c._id}>
          <strong>{CATEGORIES.find(([v]) => v === c.category)?.[1]}</strong>
          <span className={`cp-status cp-status--${c.status}`}>{c.status.replace('_', ' ')}</span>
          <p>{c.borrowRequest?.item?.title ? `${c.borrowRequest.item.title} · ` : ''}{c.against ? `against ${c.against.fullName}` : 'general'} · {formatDateTime(c.createdAt)}</p>
          <p>{c.description}</p>
          {c.adminNote && <p><em>Admin: {c.adminNote}</em></p>}
        </div>
      ))}
    </div>
  );
}