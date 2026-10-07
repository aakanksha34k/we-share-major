import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';

import api from '../api';
import PickupMap from '../components/PickupMap';
import StatusBadge from '../components/StatusBadge';
import { loadRazorpay } from '../utils/razorpay';
import {
  formatDateTime,
  formatMoney,
  getSteps,
  nextStep,
  toLocalInput
} from '../utils/borrowStatus';
import './BorrowWorkflowPage.css';

const extractToken = (text, param) => {
  try {
    return new URL(text).searchParams.get(param) || text;
  } catch {
    return text;
  }
};

// Defined OUTSIDE the page component so inputs keep focus while typing.
function PassCard({ pass, label }) {
  if (!pass) return null;
  return (
    <div className="bw-pass">
      <img src={pass.qr} alt={`${label} QR code`} width="220" height="220" />
      <div>
        <span className="bw-pass-label">Or give this code</span>
        <strong className="bw-pass-code">{pass.code}</strong>
        <span className="bw-pass-note">Valid until {formatDateTime(pass.expiresAt)}</span>
      </div>
    </div>
  );
}

function CodeEntry({ value, onChange, onSubmit, onScan, submitLabel, busy }) {
  return (
    <div className="bw-entry">
      <button type="button" className="bw-btn bw-btn--ghost" onClick={onScan} disabled={busy}>
        Scan QR with camera
      </button>
      <div className="bw-entry-row">
        <input
          className="bw-input"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="6-digit code"
          aria-label="6-digit code"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        />
        <button
          type="button"
          className="bw-btn bw-btn--primary"
          onClick={onSubmit}
          disabled={busy || value.length !== 6}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function BorrowWorkflowPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const me = JSON.parse(localStorage.getItem('user') || '{}');

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [slot, setSlot] = useState(null); // owner: chosen handoff option index
  const [handoffPass, setHandoffPass] = useState(null); // owner: { qr, code, expiresAt }
  const [returnPass, setReturnPass] = useState(null); // borrower: { qr, code, expiresAt }
  const [handoffInput, setHandoffInput] = useState(''); // borrower types pickup code
  const [returnInput, setReturnInput] = useState(''); // owner types return code
  const [scanMode, setScanMode] = useState(null);
  const [legacyReturnDate, setLegacyReturnDate] = useState('');

  const scannerRef = useRef(null);
  const handledUrlRef = useRef(false);

  /* ---------------- load ---------------- */

  const loadRequest = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const response = await api.get(`/borrow/${id}`);
        const data = response.data?.request || null;
        setRequest(data);
        if (data?.returnDate) setLegacyReturnDate(toLocalInput(data.returnDate));
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load this borrow request.');
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  const isBorrower = Boolean(request) && String(request.borrower?._id) === String(me.id);
  const isLender = Boolean(request) && String(request.lender?._id) === String(me.id);
  const role = isBorrower ? 'borrower' : 'lender';

  /* ---------------- small action wrapper ---------------- */

  const run = async (fn, fallback) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
    } catch (err) {
      setError(err.response?.data?.message || err.message || fallback);
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- owner: approve / deny ---------------- */

  const approve = () =>
    run(async () => {
      if (slot === null) throw new Error('Pick one of the handoff times first.');
      const response = await api.put(`/borrow/${id}/approve`, { handoffOptionIndex: slot });
      setMessage(response.data?.message || 'Request approved.');
      await loadRequest(true);
    }, 'Unable to approve this request.');

  const deny = () => {
    if (!window.confirm('Deny this borrow request?')) return;
    run(async () => {
      await api.put(`/borrow/${id}/deny`);
      setMessage('Request denied.');
      await loadRequest(true);
    }, 'Unable to deny this request.');
  };

  /* ---------------- legacy: stuck return_pending ---------------- */

  const confirmReturnDate = () =>
    run(async () => {
      if (!legacyReturnDate) throw new Error('Please select a return date and time.');
      const response = await api.put(`/borrow/${id}/return-date`, {
        returnDate: new Date(legacyReturnDate).toISOString()
      });
      setMessage(response.data?.message || 'Return date confirmed.');
      await loadRequest(true);
    }, 'Unable to confirm the return date.');

  /* ---------------- payments ---------------- */

  const openCheckout = ({ orderUrl, verifyUrl, description }) =>
    run(async () => {
      const { data } = await api.post(orderUrl);
      await loadRazorpay();

      // Server replies { orderId, amount, currency, keyId }
      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || 'INR',
        order_id: data.orderId,
        name: 'We Share',
        description,
        prefill: { name: me.fullName, email: me.email },
        theme: { color: '#00b894' },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (paymentResponse) => {
          try {
            const verify = await api.post(verifyUrl, paymentResponse);
            setMessage(verify.data?.message || 'Payment verified.');
            await loadRequest(true);
          } catch (err) {
            setError(err.response?.data?.message || 'Payment verification failed.');
          } finally {
            setBusy(false);
          }
        }
      });

      checkout.on('payment.failed', (failure) => {
        setError(failure?.error?.description || 'Payment failed. Please try again.');
        setBusy(false);
      });

      checkout.open();
    }, 'Unable to start the payment.');

  const payForBorrow = () =>
    openCheckout({
      orderUrl: `/payments/${id}/order`,
      verifyUrl: `/payments/${id}/verify`,
      description: request?.item?.title || 'Borrow payment'
    });

  const payLateFee = () =>
    openCheckout({
      orderUrl: `/payments/${id}/late-fee/order`,
      verifyUrl: `/payments/${id}/late-fee/verify`,
      description: 'Late return fee'
    });

  /* ---------------- handoff + return ---------------- */

  const makeQr = (param, token) =>
    QRCode.toDataURL(
      `${window.location.origin}/borrow/${id}?${param}=${encodeURIComponent(token)}`,
      { width: 280, margin: 1 }
    );

  const createHandoff = () =>
    run(async () => {
      const { data } = await api.post(`/borrow/${id}/handoff/create`);
      setHandoffPass({
        qr: await makeQr('token', data.token),
        code: data.code,
        expiresAt: data.expiresAt
      });
    }, 'Unable to create the pickup code.');

  const verifyPickup = (token = null) =>
    run(async () => {
      const payload = token ? { token } : { code: handoffInput };
      if (!token && handoffInput.length !== 6) {
        throw new Error('Enter the 6-digit pickup code, or scan the QR code.');
      }
      const response = await api.post(`/borrow/${id}/handoff/verify`, payload);
      setMessage(response.data?.message || 'Handoff verified.');
      setHandoffInput('');
      await loadRequest(true);
    }, 'Unable to verify the handoff.');

  const createReturn = () =>
    run(async () => {
      const { data } = await api.post(`/borrow/${id}/return/create`);
      setReturnPass({
        qr: await makeQr('returnToken', data.returnToken),
        code: data.returnCode,
        expiresAt: data.expiresAt
      });
    }, 'Unable to create the return code.');

  const verifyReturn = (token = null) =>
    run(async () => {
      const payload = token ? { returnToken: token } : { returnCode: returnInput };
      if (!token && returnInput.length !== 6) {
        throw new Error('Enter the 6-digit return code, or scan the QR code.');
      }
      const response = await api.post(`/borrow/${id}/return/verify`, payload);
      setMessage(response.data?.message || 'Return verified.');
      setReturnInput('');
      setReturnPass(null);
      await loadRequest(true);
    }, 'Unable to verify the return.');

  /* ---------------- camera scanner ---------------- */

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    try {
      if (scanner) {
        await scanner.stop();
        scanner.clear();
      }
    } catch {
      /* scanner was already stopped */
    }
    setScanMode(null);
  };

  const startScanner = async (mode) => {
    setError('');
    setScanMode(mode);
    await new Promise((resolve) => setTimeout(resolve, 100)); // let the container render

    try {
      const scanner = new Html5Qrcode('bw-qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          if (!scannerRef.current) return; // already handled
          await stopScanner();
          if (mode === 'handoff') verifyPickup(extractToken(decodedText, 'token'));
          else verifyReturn(extractToken(decodedText, 'returnToken'));
        },
        () => {}
      );
    } catch (err) {
      console.error('Scanner error:', err);
      scannerRef.current = null;
      setScanMode(null);
      setError('Could not start the camera. Check permissions, or type the 6-digit code instead.');
    }
  };

  useEffect(
    () => () => {
      scannerRef.current?.stop().catch(() => {});
    },
    []
  );

  /* ---------------- QR link opened with the phone camera ---------------- */

  useEffect(() => {
    if (!request || handledUrlRef.current) return;

    const token = searchParams.get('token');
    const returnToken = searchParams.get('returnToken');
    if (!token && !returnToken) return;

    handledUrlRef.current = true; // React StrictMode runs effects twice in dev
    setSearchParams({}, { replace: true });

    if (token && isBorrower) verifyPickup(token);
    else if (returnToken && isLender) verifyReturn(returnToken);
    else setError('This QR code is meant for the other person in this transaction.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  /* ---------------- render guards ---------------- */

  if (loading) {
    return (
      <div className="bw-page">
        <p className="bw-state">Loading your transaction…</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="bw-page">
        <div className="bw-state">
          <p>{error || 'This borrow request could not be found.'}</p>
          <button className="bw-btn bw-btn--primary" onClick={() => navigate('/lending-dashboard')}>
            Go to my dashboard
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- derived values ---------------- */

  const other = isBorrower ? request.lender : request.borrower;
  const steps = getSteps(request);
  const item = request.item || {};
  const pickup = request.pickupLocation || {};
  const hasCoords = pickup.latitude != null && pickup.longitude != null;
  const lateFeeDue = Number(request.lateFeeAmount || 0);
  const now = Date.now();

  const canGenerateReturn =
    ['active', 'late_fee_paid'].includes(request.status) ||
    (request.status === 'overdue' && request.lateFeePaymentStatus === 'captured');
  const mustPayLateFee =
    ['overdue', 'late_fee_pending'].includes(request.status) &&
    request.lateFeePaymentStatus !== 'captured';
  const returnable = ['active', 'overdue', 'late_fee_paid'].includes(request.status);
  const paymentDeadline = request.approvedAt
    ? new Date(new Date(request.approvedAt).getTime() + 30 * 60000)
    : null;

  /* ---------------- render ---------------- */

  return (
    <div className="bw-page">
      <header className="bw-topbar">
        <button className="bw-link" onClick={() => navigate('/lending-dashboard')}>
          ← My dashboard
        </button>
        <Link to="/hub" className="bw-logo">🔗 We Share</Link>
      </header>

      <main className="bw-main">
        {/* ---- title + progress ---- */}
        <section className="bw-card bw-hero">
          <div className="bw-hero-top">
            <div className="bw-thumb">
              {item.photos?.[0] ? <img src={item.photos[0]} alt="" /> : <span>📦</span>}
            </div>
            <div className="bw-hero-text">
              <h1>{item.title || 'Borrowed item'}</h1>
              <p>
                {isBorrower ? 'You are borrowing from' : 'You are lending to'}{' '}
                <strong>{other?.fullName || 'a student'}</strong>
              </p>
            </div>
            <StatusBadge status={request.status} />
          </div>

          {request.status !== 'denied' && (
            <ol className="bw-steps" aria-label="Progress">
              {steps.map((step) => (
                <li key={step.key} className={`bw-step bw-step--${step.state}`}>
                  <span className="bw-step-dot">{step.state === 'done' ? '✓' : ''}</span>
                  <span className="bw-step-label">{step.label}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {error && <div className="bw-alert bw-alert--error" role="alert">{error}</div>}
        {message && <div className="bw-alert bw-alert--ok" role="status">{message}</div>}

        <div className="bw-grid">
          {/* ================= LEFT: what to do now ================= */}
          <div className="bw-col">
            <section className="bw-card bw-next">
              <h2>What happens next</h2>
              <p>{nextStep(role, request)}</p>
              {other?._id && (
                <button className="bw-link" onClick={() => navigate(`/messages/${other._id}`)}>
                  💬 Message {other.fullName?.split(' ')[0] || 'them'}
                </button>                               
              )}
            </section>

              <button className="bw-link" onClick={() => navigate(`/complaints?request=${id}`)}>⚠️ Report a problem</button>

            {/* ---- OWNER: approve / deny ---- */}
            {request.status === 'pending' && isLender && (
              <section className="bw-card">
                <h2>Review this request</h2>
                <p className="bw-muted">
                  {other?.fullName} wants to borrow this and suggested three handoff times.
                  Pick the one that suits you.
                </p>
                <p className="bw-purpose">“{request.purpose}”</p>

                <div className="bw-slots" role="radiogroup" aria-label="Handoff time">
                  {request.handoffOptions.map((option, index) => {
                    const expired = new Date(option.dateTime).getTime() <= now;
                    return (
                      <label
                        key={index}
                        className={`bw-slot ${slot === index ? 'is-selected' : ''} ${expired ? 'is-expired' : ''}`}
                      >
                        <input
                          type="radio"
                          name="slot"
                          checked={slot === index}
                          disabled={expired || busy}
                          onChange={() => setSlot(index)}
                        />
                        <span>{formatDateTime(option.dateTime)}</span>
                        {expired && <em>already passed</em>}
                      </label>
                    );
                  })}
                </div>

                <div className="bw-actions">
                  <button
                    className="bw-btn bw-btn--primary"
                    onClick={approve}
                    disabled={busy || slot === null}
                  >
                    {busy ? 'Working…' : 'Approve with this time'}
                  </button>
                  <button className="bw-btn bw-btn--danger" onClick={deny} disabled={busy}>
                    Deny request
                  </button>
                </div>
              </section>
            )}

            {/* ---- BORROWER: waiting ---- */}
            {request.status === 'pending' && isBorrower && (
              <section className="bw-card">
                <h2>Your proposed times</h2>
                <ul className="bw-plain-list">
                  {request.handoffOptions.map((option, index) => (
                    <li key={index}>{formatDateTime(option.dateTime)}</li>
                  ))}
                </ul>
                <p className="bw-muted">The owner will choose one of these.</p>
              </section>
            )}

            {/* ---- legacy stuck requests ---- */}
            {request.status === 'return_pending' && isBorrower && (
              <section className="bw-card">
                <h2>Confirm your return date</h2>
                <input
                  className="bw-input"
                  type="datetime-local"
                  value={legacyReturnDate}
                  onChange={(e) => setLegacyReturnDate(e.target.value)}
                  disabled={busy}
                />
                <div className="bw-actions">
                  <button className="bw-btn bw-btn--primary" onClick={confirmReturnDate} disabled={busy}>
                    Confirm and continue
                  </button>
                </div>
              </section>
            )}

            {/* ---- BORROWER: pay ---- */}
            {request.status === 'payment_pending' && isBorrower && (
              <section className="bw-card">
                <h2>Pay to confirm</h2>
                <p className="bw-amount">{formatMoney(request.basePrice)}</p>
                {paymentDeadline && (
                  <p className="bw-muted">Pay before {formatDateTime(paymentDeadline)} or the booking is released.</p>
                )}
                <div className="bw-actions">
                  <button className="bw-btn bw-btn--primary" onClick={payForBorrow} disabled={busy}>
                    {busy ? 'Opening payment…' : 'Pay now'}
                  </button>
                </div>
                <p className="bw-muted bw-small">Payments are in test mode. No real money moves.</p>
              </section>
            )}

            {/* ---- HANDOFF ---- */}
            {request.status === 'handoff_pending' && isLender && (
              <section className="bw-card">
                <h2>Hand over the item</h2>
                <p className="bw-muted">
                  Meet at {pickup.label || 'the pickup spot'} on {formatDateTime(request.selectedHandoffAt)}.
                  When you’re together, generate a code and let the borrower scan it.
                </p>
                <div className="bw-actions">
                  <button className="bw-btn bw-btn--primary" onClick={createHandoff} disabled={busy}>
                    {handoffPass ? 'Generate a new code' : 'Generate pickup QR and code'}
                  </button>
                </div>
                <PassCard pass={handoffPass} label="Pickup" />
              </section>
            )}

            {request.status === 'handoff_pending' && isBorrower && (
              <section className="bw-card">
                <h2>Pick up the item</h2>
                <p className="bw-muted">
                  Meet at {pickup.label || 'the pickup spot'} on {formatDateTime(request.selectedHandoffAt)}.
                  The owner will show you a QR code.
                </p>
                <CodeEntry
                  value={handoffInput}
                  onChange={setHandoffInput}
                  onSubmit={() => verifyPickup()}
                  onScan={() => startScanner('handoff')}
                  submitLabel="Confirm pickup"
                  busy={busy}
                />
              </section>
            )}

            {/* ---- LATE FEE (borrower) ---- */}
            {mustPayLateFee && isBorrower && lateFeeDue > 0 && (
              <section className="bw-card bw-card--warn">
                <h2>Late fee</h2>
                <p className="bw-amount">₹{lateFeeDue}</p>
                <p className="bw-muted">
The return time has passed. The fee is ₹{request.lateFeePerDay} for every 24 hours (or part of it) after the due time.                </p>
                <div className="bw-actions">
                  <button className="bw-btn bw-btn--primary" onClick={payLateFee} disabled={busy}>
                    {busy ? 'Opening payment…' : 'Pay late fee'}
                  </button>
                </div>
              </section>
            )}

            {/* ---- RETURN ---- */}
            {returnable && isBorrower && (
              <section className="bw-card">
                <h2>Return the item</h2>
                {canGenerateReturn ? (
                  <>
                    <p className="bw-muted">
                      When you meet the owner, generate a code and let them scan it.
                    </p>
                    <div className="bw-actions">
                      <button className="bw-btn bw-btn--primary" onClick={createReturn} disabled={busy}>
                        {returnPass ? 'Generate a new code' : 'Generate return QR and code'}
                      </button>
                    </div>
                    <PassCard pass={returnPass} label="Return" />
                  </>
                ) : (
                  <p className="bw-muted">Pay the late fee above to unlock the return code.</p>
                )}
              </section>
            )}

            {returnable && isLender && (
              <section className="bw-card">
                <h2>Receive the item back</h2>
                <p className="bw-muted">
                  When the borrower hands it back, scan their return QR or type their code.
                </p>
                <CodeEntry
                  value={returnInput}
                  onChange={setReturnInput}
                  onSubmit={() => verifyReturn()}
                  onScan={() => startScanner('return')}
                  submitLabel="Confirm return"
                  busy={busy}
                />
              </section>
            )}

            {/* ---- scanner ---- */}
            {scanMode && (
              <section className="bw-card">
                <h2>{scanMode === 'handoff' ? 'Scan the pickup QR' : 'Scan the return QR'}</h2>
                <div id="bw-qr-reader" className="bw-reader" />
                <div className="bw-actions">
                  <button className="bw-btn bw-btn--ghost" onClick={stopScanner}>Stop camera</button>
                </div>
              </section>
            )}

            {request.status === 'returned' && (
              <section className="bw-card bw-card--done">
                <h2>Returned</h2>
                <p className="bw-muted">
                  Verified {formatDateTime(request.actualReturnDate)}. The item is available again.
                </p>
              </section>
            )}
            {request.status === 'completed' && (
  <section className="bw-card bw-card--done">
    <h2>Completed</h2>
    <p className="bw-muted">{isBorrower ? 'The item is yours.' : 'The item was sold.'}</p>
  </section>
)}

            {request.status === 'denied' && (
              <section className="bw-card">
                <h2>Request closed</h2>
                <p className="bw-muted">
                  {isBorrower
                    ? 'This request was denied or expired. You can browse and request another item.'
                    : 'You denied this request, or it expired.'}
                </p>
                <div className="bw-actions">
                  <button className="bw-btn bw-btn--primary" onClick={() => navigate('/dashboard')}>
                    Browse marketplace
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* ================= RIGHT: details ================= */}
          <aside className="bw-col">
            <section className="bw-card">
              <h2>Details</h2>
              <dl className="bw-details">
                <div><dt>Price</dt><dd>{formatMoney(request.basePrice)}</dd></div>
                {request.basePrice > 0 && request.type !== 'purchase' && (
  <div><dt>Late fee</dt><dd>₹{request.lateFeePerDay} / 24 hrs</dd></div>
)}
                <div>
                  <dt>Handoff</dt>
                  <dd>
                    {request.selectedHandoffAt
                      ? formatDateTime(request.selectedHandoffAt)
                      : 'Not chosen yet'}
                  </dd>
                </div>
{request.type !== 'purchase' && (
  <div>
    <dt>{request.status === 'handoff_pending' || request.status === 'pending' ? 'Planned return' : 'Return by'}</dt>
    <dd>{formatDateTime(request.returnDate)}</dd>
  </div>
)}                <div><dt>Purpose</dt><dd>{request.purpose}</dd></div>
              </dl>
            </section>

            <section className="bw-card">
              <h2>Meeting spot</h2>
              <p className="bw-spot">{pickup.label || 'To be agreed in chat'}</p>
              {pickup.address && <p className="bw-muted">{pickup.address}</p>}
              {hasCoords && (
                <>
                  <PickupMap
                    value={{ latitude: pickup.latitude, longitude: pickup.longitude }}
                    readOnly
                  />
                </>
              )}
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default BorrowWorkflowPage;
