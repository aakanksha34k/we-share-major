import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api';
import PickupMap from '../components/PickupMap';

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load Razorpay Checkout.'));
    document.body.appendChild(script);
  });
}

export default function BorrowWorkflowPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [code, setCode] = useState('');
  const [scanMode, setScanMode] = useState('');
  const scannerRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const load = async () => {
    try { setRequest((await api.get(`/borrow/${id}`)).data); }
    catch (e) { setError(e.response?.data?.message || 'Could not load borrowing transaction.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  useEffect(() => () => { if (scannerRef.current) scannerRef.current.stop().catch(() => {}); }, []);

  useEffect(() => {
    if (!request) return;
    const token = searchParams.get('token');
    const returnToken = searchParams.get('returnToken');
    if (token && request.borrower?._id === currentUser.id && request.handoffStatus !== 'verified') verifyPickup(token);
    if (returnToken && request.lender?._id === currentUser.id && request.status !== 'returned') verifyReturn(returnToken);
  }, [request?._id, searchParams.toString()]);

  const createHandoff = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const { data } = await api.post(`/borrow/${id}/handoff/create`);
      const url = `${window.location.origin}/handoff/${id}?token=${encodeURIComponent(data.token)}`;
      setQrDataUrl(await QRCode.toDataURL(url, { width: 280, margin: 2 }));
      setCode(data.code);
      setMessage('Show this QR or 6-digit code to the borrower at pickup.');
    } catch (e) { setError(e.response?.data?.message || 'Could not create pickup verification.'); }
    finally { setBusy(false); }
  };

  const generateReturn = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const { data } = await api.post(`/borrow/${id}/return/create`);
      const url = `${window.location.origin}/handoff/${id}?returnToken=${encodeURIComponent(data.token)}`;
      setQrDataUrl(await QRCode.toDataURL(url, { width: 280, margin: 2 }));
      setCode(data.code);
      setMessage('Show this return QR/code to the lender.');
    } catch (e) { setError(e.response?.data?.message || 'Could not create return verification.'); }
    finally { setBusy(false); }
  };

  const verifyPickup = async (token, enteredCode = '') => {
    setBusy(true); setError('');
    try { await api.post(`/borrow/${id}/handoff/verify`, { token, code: enteredCode }); setMessage('Pickup verified. Borrowing is now active.'); setQrDataUrl(''); setCode(''); await load(); }
    catch (e) { setError(e.response?.data?.message || 'Pickup verification failed.'); }
    finally { setBusy(false); }
  };

  const verifyReturn = async (token, enteredCode = '') => {
    setBusy(true); setError('');
    try { await api.post(`/borrow/${id}/return/verify`, { token, code: enteredCode }); setMessage('Return verified. The item is available again.'); setQrDataUrl(''); setCode(''); await load(); }
    catch (e) { setError(e.response?.data?.message || 'Return verification failed.'); }
    finally { setBusy(false); }
  };

  const startScanner = async (mode) => {
    setScanMode(mode); setError('');
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode('we-share-qr-reader');
        scannerRef.current = scanner;
        await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 }, async (decoded) => {
          const url = new URL(decoded);
          const token = url.searchParams.get(mode === 'pickup' ? 'token' : 'returnToken');
          await scanner.stop();
          scannerRef.current = null;
          setScanMode('');
          if (!token) throw new Error('This QR code is not a valid We Share handoff code.');
          mode === 'pickup' ? verifyPickup(token) : verifyReturn(token);
        }, () => {});
      } catch (e) { setError(e.message || 'Could not start camera scanner.'); setScanMode(''); }
    }, 100);
  };

  const pay = async (lateFee = false) => {
    setBusy(true); setError('');
    try {
      await loadRazorpay();
      const endpoint = lateFee ? `/payments/${id}/late-fee/order` : `/payments/${id}/order`;
      const { data: order } = await api.post(endpoint);
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'We Share',
        description: lateFee ? 'We Share late return fee' : `We Share borrowing payment for ${request.item?.title}`,
        order_id: order.orderId,
        prefill: { name: currentUser.fullName, email: currentUser.email },
        theme: { color: '#2563eb' },
        handler: async (response) => {
          try {
            const verifyEndpoint = lateFee ? `/payments/${id}/late-fee/verify` : `/payments/${id}/verify`;
            await api.post(verifyEndpoint, response);
            setMessage('Payment verified successfully.');
            await load();
          } catch (e) { setError(e.response?.data?.message || 'Payment verification failed.'); }
          finally { setBusy(false); }
        },
        modal: { ondismiss: () => setBusy(false) }
      };
      new window.Razorpay(options).open();
    } catch (e) { setError(e.response?.data?.message || e.message || 'Payment could not start.'); setBusy(false); }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading transaction...</div>;
  if (!request) return <div style={{ padding: 40 }}>Transaction not found.</div>;

  const isBorrower = request.borrower?._id === currentUser.id;
  const isLender = request.lender?._id === currentUser.id;
  const pickupUrl = request.pickupLocation?.latitude != null ? `https://www.google.com/maps/search/?api=1&query=${request.pickupLocation.latitude},${request.pickupLocation.longitude}` : null;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <button onClick={() => navigate('/lending-dashboard')}>← Back</button>
      <h1>{request.item?.title || 'Borrowing transaction'}</h1>
      <p><strong>Status:</strong> {request.status}</p>
      <p><strong>Price:</strong> {request.basePrice === 0 ? 'FREE' : `₹${request.basePrice}`}</p>
      <p><strong>Return by:</strong> {new Date(request.returnDate).toLocaleString('en-IN')}</p>

      <section style={{ marginTop: 20, padding: 20, border: '1px solid #ddd', borderRadius: 16 }}>
        <h2>Pickup location</h2>
        <p>{request.pickupLocation?.label}</p>
        <p>{request.pickupLocation?.address}</p>
        {request.pickupLocation?.latitude != null && <PickupMap value={{ latitude: request.pickupLocation.latitude, longitude: request.pickupLocation.longitude }} readOnly />}
        {pickupUrl && <p><a href={pickupUrl} target="_blank" rel="noreferrer">Open in Google Maps ↗</a></p>}
      </section>

      {error && <div style={{ marginTop: 16, padding: 12, background: '#fee2e2' }}>{error}</div>}
      {message && <div style={{ marginTop: 16, padding: 12, background: '#dcfce7' }}>{message}</div>}

      {isBorrower && request.status === 'payment_pending' && <section style={{ marginTop: 20 }}><button disabled={busy} onClick={() => pay(false)}>Pay ₹{request.basePrice} with Razorpay Test Mode</button></section>}
      {isBorrower && ['overdue', 'late_fee_pending'].includes(request.status) && request.lateFeePaymentStatus !== 'captured' && <section style={{ marginTop: 20 }}><h2>Late return fee</h2><p>Late fee: ₹{request.lateFeeAmount}</p><button disabled={busy} onClick={() => pay(true)}>Pay Late Fee ₹{request.lateFeeAmount}</button></section>}

      {isLender && ['handoff_pending', 'paid'].includes(request.status) && request.handoffStatus !== 'verified' && <section style={{ marginTop: 20 }}><h2>Pickup verification</h2><button disabled={busy} onClick={createHandoff}>Generate QR + Code</button></section>}
      {isBorrower && request.status === 'handoff_pending' && request.handoffStatus !== 'verified' && <section style={{ marginTop: 20 }}><h2>Pickup verification</h2><button disabled={busy} onClick={() => startScanner('pickup')}>Scan lender QR</button><div style={{ marginTop: 10 }}><input placeholder="Or enter 6-digit code" value={code} onChange={e => setCode(e.target.value)} /><button disabled={busy || code.length !== 6} onClick={() => verifyPickup('', code)}>Verify Code</button></div></section>}

      {isBorrower && ['active', 'overdue', 'late_fee_paid'].includes(request.status) && <section style={{ marginTop: 20 }}><h2>Return</h2><p>Generate a return QR/code and show it to the lender.</p><button disabled={busy} onClick={generateReturn}>Generate Return QR + Code</button></section>}
      {isLender && ['active', 'overdue', 'late_fee_paid'].includes(request.status) && <section style={{ marginTop: 20 }}><h2>Return verification</h2><button disabled={busy} onClick={() => startScanner('return')}>Scan borrower's Return QR</button><div style={{ marginTop: 10 }}><input placeholder="Or enter 6-digit code" value={code} onChange={e => setCode(e.target.value)} /><button disabled={busy || code.length !== 6} onClick={() => verifyReturn('', code)}>Verify Return Code</button></div></section>}

      {qrDataUrl && <section style={{ marginTop: 20, textAlign: 'center' }}><h2>Show this QR</h2><img src={qrDataUrl} alt="We Share verification QR" style={{ width: 280, maxWidth: '100%' }} /><p><strong>Backup code: {code}</strong></p></section>}
      {scanMode && <section style={{ marginTop: 20 }}><h2>Scan QR</h2><div id="we-share-qr-reader" style={{ width: '100%', maxWidth: 500 }} /><button onClick={async () => { if (scannerRef.current) await scannerRef.current.stop().catch(() => {}); scannerRef.current = null; setScanMode(''); }}>Stop Scanner</button></section>}
    </div>
  );
}
