import { useEffect, useState } from 'react';

export const CATEGORY_LABELS = {
  not_returned: 'Item was not returned',
  item_damaged: 'Item returned damaged',
  not_as_described: 'Item not as described',
  no_show: 'Person did not show up',
  payment_issue: 'Payment problem',
  harassment: 'Harassment or abuse',
  other: 'Something else'
};

const fmt = (v) => (v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

// Full complaint view for admins: complete text, both people, the transaction,
// and a reply box that can also email the reporter.
export default function ComplaintModal({ complaint, busy, onClose, onSubmit, onToggleBan }) {
  const [note, setNote] = useState(complaint.adminNote || '');
  const [emailReporter, setEmailReporter] = useState(true);
  const [notifyAgainst, setNotifyAgainst] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const act = (status) => onSubmit(complaint._id, { status, adminNote: note, emailReporter, notifyAgainst });
  const against = complaint.against;
  const request = complaint.borrowRequest;

  return (
    <div className="adm-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="adm-modal cmp-modal" role="dialog" aria-modal="true">
        <div className="adm-modal-header">
          <h2>Complaint details</h2>
          <button className="adm-modal-close" onClick={onClose} disabled={busy}>✕</button>
        </div>

        <div className="adm-modal-body">
          <div className="cmp-head">
            <strong>{CATEGORY_LABELS[complaint.category] || complaint.category}</strong>
            <span className={`cp-status cp-status--${complaint.status}`}>{complaint.status.replace('_', ' ')}</span>
          </div>

          <dl className="cmp-grid">
            <div><dt>Filed</dt><dd>{fmt(complaint.createdAt)}</dd></div>
            <div><dt>Resolved</dt><dd>{fmt(complaint.resolvedAt)}</dd></div>
            <div><dt>From (reporter)</dt><dd>{complaint.reporter?.fullName || 'Deleted user'}<br /><small>{complaint.reporter?.email}</small></dd></div>
            <div>
              <dt>Against</dt>
              <dd>
                {against?.fullName || '—'}{against?.isBanned && ' (banned)'}
                <br /><small>{against?.email}</small>
              </dd>
            </div>
            <div><dt>Transaction</dt><dd>{request?.item?.title || 'General complaint'}{request?.status && <><br /><small>status: {request.status.replace(/_/g, ' ')} · {request.type === 'purchase' ? 'sale' : 'lending'}</small></>}</dd></div>
          </dl>

          <h4 className="cmp-label">What the student wrote</h4>
          <div className="cmp-text">{complaint.description}</div>

          <h4 className="cmp-label">Your reply / admin note</h4>
          <textarea className="cmp-note" rows={4} maxLength={1000} value={note} disabled={busy}
            placeholder="Explain what you decided. This is shown to the reporter and can be emailed."
            onChange={(e) => setNote(e.target.value)} />

          <label className="cmp-check">
            <input type="checkbox" checked={emailReporter} onChange={(e) => setEmailReporter(e.target.checked)} />
            Email this reply to the reporter ({complaint.reporter?.email || 'no email'})
          </label>
          {against && (
            <label className="cmp-check">
              <input type="checkbox" checked={notifyAgainst} onChange={(e) => setNotifyAgainst(e.target.checked)} />
              Also notify and email {against.fullName}
            </label>
          )}
        </div>

        <div className="adm-modal-footer cmp-footer">
          {against && against.role !== 'admin' && (
            <button className="cmp-btn cmp-btn--ban" disabled={busy} onClick={() => onToggleBan(against._id)}>
              {against.isBanned ? '🔓 Unban user' : '🔒 Ban user'}
            </button>
          )}
          <span className="cmp-spacer" />
          <button className="cmp-btn" disabled={busy} onClick={() => act('in_review')}>👀 Mark in review</button>
          <button className="cmp-btn cmp-btn--no" disabled={busy} onClick={() => act('dismissed')}>❌ Dismiss</button>
          <button className="cmp-btn cmp-btn--ok" disabled={busy} onClick={() => act('resolved')}>✅ Resolve</button>
        </div>
      </div>
    </div>
  );
}
