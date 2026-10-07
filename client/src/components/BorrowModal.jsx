import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api';
import { formatMoney } from '../utils/borrowStatus';
import './BorrowModal.css';

const LATE_FEE = import.meta.env.VITE_LATE_FEE_PER_DAY || '20';

const nowInput = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function BorrowModal({ item, onClose, onSuccess }) {
  const [purpose, setPurpose] = useState('');
  const [options, setOptions] = useState(['', '', '']);
  const [returnDate, setReturnDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isSale = item.listingType === 'sell';

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !loading && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [loading, onClose]);

  const setOption = (i, v) => setOptions((p) => p.map((o, idx) => (idx === i ? v : o)));

  const submit = async (e) => {
  e.preventDefault();
  setError('');

  if (!isSale && !purpose.trim()) return setError('Please tell the owner why you need this item.');
  if (options.some((o) => !o)) return setError('Please choose all 3 handoff times.');
  if (!isSale && !returnDate) return setError('Please choose when you will return it.');

  const handoffs = options.map((o) => new Date(o));
  const ret = isSale ? null : new Date(returnDate);
  const now = Date.now();

  if (new Set(handoffs.map((d) => d.getTime())).size !== 3)
    return setError('The 3 handoff times must be different.');
  if (handoffs.some((d) => d.getTime() <= now))
    return setError('Handoff times must be in the future.');

  if (!isSale) {
    if (ret.getTime() <= Math.max(...handoffs.map((d) => d.getTime())))
      return setError('Return time must be after all 3 handoff times.');
  }

  try {
    setLoading(true);
    const { data } = await api.post('/borrow', {
      itemId: item._id,
      purpose: purpose.trim(),
      handoffOptions: handoffs.map((d) => ({ dateTime: d.toISOString() })),
      returnDate: ret ? ret.toISOString() : undefined
    });
    onSuccess?.(data.request);
  } catch (err) {
    setError(err.response?.data?.message || 'Unable to send the request.');
    setLoading(false);
  }
};

  const min = nowInput();

  return createPortal(
    <div className="bm-overlay" onMouseDown={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div className="bm-dialog" role="dialog" aria-modal="true" aria-labelledby="bm-title">
        <div className="bm-header">
          <div>
            <h2 id="bm-title">{isSale ? 'Buy this item' : 'Request to borrow'}</h2>
            <p>{item.title}</p>
          </div>
          <button type="button" className="bm-close" onClick={onClose} disabled={loading} aria-label="Close">×</button>
        </div>

        <div className="bm-summary">
          <span><strong>Price:</strong> {item.isFree ? 'Free' : formatMoney(item.price)}</span>
{!isSale && <span><strong>Late fee:</strong> ₹{LATE_FEE} / 24 hrs</span>}          <span><strong>Meet at:</strong> {item.pickupLocation || 'To be agreed in chat'}</span>
        </div>

        <form onSubmit={submit}>
          {!isSale && (
          <div className="bm-field">
            <label htmlFor="bm-purpose">Why do you need it?</label>
            <textarea id="bm-purpose" rows={3} maxLength={1000} value={purpose}
              onChange={(e) => setPurpose(e.target.value)} disabled={loading}
              placeholder="e.g. Need it for my lab exam on Friday" />
          </div>
          )}

          <fieldset className="bm-field">
            <legend>3 times you could meet the owner</legend>
            <p className="bm-help">The owner will pick one. Times are in your local time.</p>
            {options.map((o, i) => (
              <div className="bm-option" key={i}>
                <label htmlFor={`bm-o-${i}`}>Option {i + 1}</label>
                <input id={`bm-o-${i}`} type="datetime-local" min={min} value={o}
                  onChange={(e) => setOption(i, e.target.value)} disabled={loading} />
              </div>
            ))}
          </fieldset>

          {!isSale && (
          <div className="bm-field">
            <label htmlFor="bm-return">I will return it by</label>
            <input id="bm-return" type="datetime-local" min={min} value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)} disabled={loading} />
            <p className="bm-help">
              This sets how long you'll keep it. The clock starts when you actually receive the item.
              Late returns cost ₹{LATE_FEE} per 24 hours.
            </p>
          </div>
          )}

          {error && <div className="bm-error" role="alert">{error}</div>}

          <div className="bm-actions">
            <button type="button" className="bm-btn bm-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="bm-btn bm-btn--primary" disabled={loading}>
              {loading ? 'Sending…' : isSale ? 'Send purchase request' : 'Send request'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}