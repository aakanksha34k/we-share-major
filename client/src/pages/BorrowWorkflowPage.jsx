import React, {
  useEffect,
  useRef,
  useState
} from 'react';

import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';

import api from '../api';
import PickupMap from '../components/PickupMap';

const BorrowWorkflowPage = () => {
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

  const [returnQrDataUrl, setReturnQrDataUrl] = useState('');
  const [returnCode, setReturnCode] = useState('');

  const [scanMode, setScanMode] = useState(null);

  const [returnDate, setReturnDate] = useState('');

  const scannerRef = useRef(null);

  /*
  |--------------------------------------------------------------------------
  | LOAD REQUEST
  |--------------------------------------------------------------------------
  */

  const loadRequest = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/borrow/${id}`);

      const data = response.data?.request;

      setRequest(data || null);

      if (data?.returnDate) {
        const date = new Date(data.returnDate);

        if (!Number.isNaN(date.getTime())) {
          setReturnDate(
            new Date(
              date.getTime() -
                date.getTimezoneOffset() * 60000
            )
              .toISOString()
              .slice(0, 16)
          );
        }
      }
    } catch (err) {
      console.error('loadRequest error:', err);

      setError(
        err.response?.data?.message ||
          'Unable to load borrow request.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequest();
  }, [id]);

  /*
  |--------------------------------------------------------------------------
  | AUTO VERIFY FROM QR URL
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const token = searchParams.get('token');
    const returnToken = searchParams.get('returnToken');

    if (token) {
      verifyPickup(token);
    }

    if (returnToken) {
      verifyReturn(returnToken);
    }
  }, [searchParams]);

  /*
  |--------------------------------------------------------------------------
  | HELPERS
  |--------------------------------------------------------------------------
  */

  const formatDateTime = (value) => {
    if (!value) return 'Not selected';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Waiting for owner approval',
      approved: 'Approved',
      return_pending: 'Waiting for return confirmation',
      payment_pending: 'Payment required',
      paid: 'Payment completed',
      handoff_pending: 'Handoff pending',
      active: 'Item currently borrowed',
      overdue: 'Return overdue',
      late_fee_pending: 'Late fee pending',
      late_fee_paid: 'Late fee paid',
      returned: 'Returned',
      denied: 'Request denied'
    };

    return labels[status] || status;
  };

  /*
  |--------------------------------------------------------------------------
  | CONFIRM RETURN DATE
  |--------------------------------------------------------------------------
  |
  | This remains here only as a compatibility fallback for older
  | requests that may still be in return_pending.
  |
  | New requests already contain returnDate when created.
  |--------------------------------------------------------------------------
  */

  const confirmReturnDate = async () => {
    if (!returnDate) {
      setError('Please select a return date and time.');
      return;
    }

    try {
      setBusy(true);
      setError('');
      setMessage('');

      const response = await api.put(
        `/borrow/${id}/return-date`,
        {
          returnDate: new Date(returnDate).toISOString()
        }
      );

      setRequest(
        response.data?.request || request
      );

      setMessage(
        response.data?.message ||
          'Return date confirmed.'
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to confirm return date.'
      );
    } finally {
      setBusy(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CREATE HANDOFF QR / CODE
  |--------------------------------------------------------------------------
  */

  const createHandoff = async () => {
    try {
      setBusy(true);
      setError('');
      setMessage('');

      const response = await api.post(
        `/borrow/${id}/handoff/create`
      );

      const token = response.data?.token;
      const generatedCode = response.data?.code;

      setCode(generatedCode || '');

      if (token) {
        const qrUrl =
          `${window.location.origin}` +
          `/borrow/${id}?token=${encodeURIComponent(token)}`;

        const qr = await QRCode.toDataURL(qrUrl);

        setQrDataUrl(qr);
      }

      setMessage(
        response.data?.message ||
          'Handoff verification created.'
      );

      await loadRequest();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to create handoff verification.'
      );
    } finally {
      setBusy(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | VERIFY HANDOFF
  |--------------------------------------------------------------------------
  */

  const verifyPickup = async (tokenValue = null) => {
    try {
      setBusy(true);
      setError('');
      setMessage('');

      const payload = {};

      if (tokenValue) {
        payload.token = tokenValue;
      } else if (code) {
        payload.code = code;
      } else {
        setError(
          'Please scan the QR code or enter the handoff code.'
        );
        return;
      }

      const response = await api.post(
        `/borrow/${id}/handoff/verify`,
        payload
      );

      setMessage(
        response.data?.message ||
          'Handoff verified successfully.'
      );

      setQrDataUrl('');
      setCode('');

      await loadRequest();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to verify handoff.'
      );
    } finally {
      setBusy(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CREATE RETURN QR / CODE
  |--------------------------------------------------------------------------
  */

  const generateReturn = async () => {
    try {
      setBusy(true);
      setError('');
      setMessage('');

      const response = await api.post(
        `/borrow/${id}/return/create`
      );

      const token = response.data?.returnToken;
      const generatedCode =
        response.data?.returnCode;

      setReturnCode(generatedCode || '');

      if (token) {
        const qrUrl =
          `${window.location.origin}` +
          `/borrow/${id}?returnToken=${encodeURIComponent(
            token
          )}`;

        const qr = await QRCode.toDataURL(qrUrl);

        setReturnQrDataUrl(qr);
      }

      setMessage(
        response.data?.message ||
          'Return verification created.'
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to create return verification.'
      );
    } finally {
      setBusy(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | VERIFY RETURN
  |--------------------------------------------------------------------------
  */

  const verifyReturn = async (tokenValue = null) => {
    try {
      setBusy(true);
      setError('');
      setMessage('');

      const payload = {};

      if (tokenValue) {
        payload.returnToken = tokenValue;
      } else if (returnCode) {
        payload.returnCode = returnCode;
      } else {
        setError(
          'Please scan the return QR code or enter the return code.'
        );
        return;
      }

      const response = await api.post(
        `/borrow/${id}/return/verify`,
        payload
      );

      setMessage(
        response.data?.message ||
          'Return verified successfully.'
      );

      setReturnQrDataUrl('');
      setReturnCode('');

      await loadRequest();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to verify return.'
      );
    } finally {
      setBusy(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | QR SCANNER
  |--------------------------------------------------------------------------
  */

  const startScanner = async (mode) => {
    try {
      setError('');
      setScanMode(mode);

      await new Promise((resolve) =>
        setTimeout(resolve, 100)
      );

      const scanner = new Html5Qrcode(
        'borrow-qr-reader'
      );

      scannerRef.current = scanner;

      await scanner.start(
        {
          facingMode: 'environment'
        },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250
          }
        },
        async (decodedText) => {
          try {
            await scanner.stop();
          } catch (stopError) {
            console.error(stopError);
          }

          scannerRef.current = null;
          setScanMode(null);

          try {
            const url = new URL(decodedText);

            const token =
              url.searchParams.get('token');

            const returnToken =
              url.searchParams.get('returnToken');

            if (mode === 'handoff' && token) {
              await verifyPickup(token);
              return;
            }

            if (
              mode === 'return' &&
              returnToken
            ) {
              await verifyReturn(returnToken);
              return;
            }
          } catch (urlError) {
            console.error(
              'QR URL parsing error:',
              urlError
            );
          }

          if (mode === 'handoff') {
            await verifyPickup(decodedText);
          } else {
            await verifyReturn(decodedText);
          }
        },
        () => {}
      );
    } catch (err) {
      console.error('Scanner error:', err);

      setScanMode(null);

      setError(
        'Unable to start camera scanner. Please check camera permissions.'
      );
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch (err) {
      console.error('stopScanner error:', err);
    }

    scannerRef.current = null;
    setScanMode(null);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {});
      }
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | NORMAL PAYMENT
  |--------------------------------------------------------------------------
  */

  const payForBorrow = async () => {
    try {
      setBusy(true);
      setError('');
      setMessage('');

      const orderResponse = await api.post(
        `/payments/${id}/order`
      );

      const order = orderResponse.data?.order;

      if (!order) {
        throw new Error(
          'Payment order was not created.'
        );
      }

      if (!window.Razorpay) {
        throw new Error(
          'Razorpay is not available.'
        );
      }

      const razorpay = new window.Razorpay({
        key: order.key || orderResponse.data?.key,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'We Share',
        description:
          request?.item?.title ||
          'Borrow request',

        order_id: order.id,

        handler: async (paymentResponse) => {
          try {
            setBusy(true);

            const verifyResponse =
              await api.post(
                `/payments/${id}/verify`,
                paymentResponse
              );

            setMessage(
              verifyResponse.data?.message ||
                'Payment completed.'
            );

            await loadRequest();
          } catch (err) {
            setError(
              err.response?.data?.message ||
                'Payment verification failed.'
            );
          } finally {
            setBusy(false);
          }
        }
      });

      razorpay.open();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to start payment.'
      );

      setBusy(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LATE FEE PAYMENT
  |--------------------------------------------------------------------------
  */

  const payLateFee = async () => {
    try {
      setBusy(true);
      setError('');
      setMessage('');

      const orderResponse = await api.post(
        `/payments/${id}/late-fee/order`
      );

      const order = orderResponse.data?.order;

      if (!order) {
        throw new Error(
          'Late fee payment order was not created.'
        );
      }

      if (!window.Razorpay) {
        throw new Error(
          'Razorpay is not available.'
        );
      }

      const razorpay = new window.Razorpay({
        key: order.key || orderResponse.data?.key,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'We Share',
        description: 'Late return fee',

        order_id: order.id,

        handler: async (paymentResponse) => {
          try {
            setBusy(true);

            const verifyResponse =
              await api.post(
                `/payments/${id}/late-fee/verify`,
                paymentResponse
              );

            setMessage(
              verifyResponse.data?.message ||
                'Late fee payment completed.'
            );

            await loadRequest();
          } catch (err) {
            setError(
              err.response?.data?.message ||
                'Late fee verification failed.'
            );
          } finally {
            setBusy(false);
          }
        }
      });

      razorpay.open();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to start late fee payment.'
      );

      setBusy(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="borrow-page">
        <p>Loading borrow request...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="borrow-page">
        <p>
          {error ||
            'Borrow request could not be found.'}
        </p>

        <button
          onClick={() => navigate(-1)}
        >
          Go Back
        </button>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="borrow-page">
      <div className="borrow-page-header">
        <button
          type="button"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <h1>Borrow Request</h1>
      </div>

      {error && (
        <div className="borrow-error">
          {error}
        </div>
      )}

      {message && (
        <div className="borrow-success">
          {message}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ITEM */}
      {/* ------------------------------------------------------------- */}

      <section className="borrow-card">
        <h2>
          {request.item?.title ||
            'Borrowed Item'}
        </h2>

        {request.item?.category && (
          <p>
            Category: {request.item.category}
          </p>
        )}

        {request.item?.condition && (
          <p>
            Condition: {request.item.condition}
          </p>
        )}
      </section>

      {/* ------------------------------------------------------------- */}
      {/* STATUS */}
      {/* ------------------------------------------------------------- */}

      <section className="borrow-card">
        <h3>Status</h3>

        <p>
          {getStatusLabel(request.status)}
        </p>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* PURPOSE */}
      {/* ------------------------------------------------------------- */}

      <section className="borrow-card">
        <h3>Purpose</h3>

        <p>
          {request.purpose ||
            'No purpose provided.'}
        </p>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* THREE PROPOSED HANDOFF OPTIONS */}
      {/* ------------------------------------------------------------- */}

      {request.handoffOptions?.length > 0 && (
        <section className="borrow-card">
          <h3>
            Proposed Handoff Times
          </h3>

          <p>
            The borrower provided these possible
            handoff times. The owner selects one
            during approval.
          </p>

          <div className="handoff-options-list">
            {request.handoffOptions.map(
              (option, index) => {
                const selected =
                  request.selectedHandoffAt &&
                  new Date(
                    request.selectedHandoffAt
                  ).getTime() ===
                    new Date(
                      option.dateTime
                    ).getTime();

                return (
                  <div
                    key={index}
                    className={
                      selected
                        ? 'handoff-option selected'
                        : 'handoff-option'
                    }
                  >
                    <strong>
                      Option {index + 1}
                    </strong>

                    <span>
                      {formatDateTime(
                        option.dateTime
                      )}
                    </span>

                    {selected && (
                      <span>
                        ✓ Selected by owner
                      </span>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CONFIRMED HANDOFF */}
      {/* ------------------------------------------------------------- */}

      {request.selectedHandoffAt && (
        <section className="borrow-card">
          <h3>
            Confirmed Handoff
          </h3>

          <p>
            {formatDateTime(
              request.selectedHandoffAt
            )}
          </p>

          <small>
            This is the handoff time selected
            by the item owner.
          </small>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* RETURN DATE */}
      {/* ------------------------------------------------------------- */}

      {request.returnDate && (
        <section className="borrow-card">
          <h3>
            Return By
          </h3>

          <p>
            {formatDateTime(
              request.returnDate
            )}
          </p>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PICKUP LOCATION */}
      {/* ------------------------------------------------------------- */}

      {request.pickupLocation && (
        <section className="borrow-card">
          <h3>
            Handoff Location
          </h3>

          {request.pickupLocation.label && (
            <p>
              <strong>
                {request.pickupLocation.label}
              </strong>
            </p>
          )}

          {request.pickupLocation.address && (
            <p>
              {request.pickupLocation.address}
            </p>
          )}

          {request.pickupLocation.latitude != null &&
            request.pickupLocation.longitude != null && (
              <>
                <PickupMap
                  latitude={
                    request.pickupLocation.latitude
                  }
                  longitude={
                    request.pickupLocation.longitude
                  }
                />

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${request.pickupLocation.latitude},${request.pickupLocation.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Google Maps
                </a>
              </>
            )}
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* OLD REQUEST COMPATIBILITY: RETURN DATE */}
      {/* ------------------------------------------------------------- */}

      {request.status === 'return_pending' &&
        !request.returnDate && (
          <section className="borrow-card">
            <h3>
              Confirm Return Date
            </h3>

            <p>
              Select when you expect to return
              the item.
            </p>

            <input
              type="datetime-local"
              value={returnDate}
              onChange={(e) =>
                setReturnDate(e.target.value)
              }
              disabled={busy}
            />

            <button
              type="button"
              onClick={confirmReturnDate}
              disabled={busy}
            >
              {busy
                ? 'Saving...'
                : 'Confirm Return Date'}
            </button>
          </section>
        )}

      {/* ------------------------------------------------------------- */}
      {/* PAYMENT */}
      {/* ------------------------------------------------------------- */}

      {request.status ===
        'payment_pending' && (
        <section className="borrow-card">
          <h3>
            Payment Required
          </h3>

          <p>
            Amount:{' '}
            ₹
            {Number(
              request.basePrice || 0
            ).toFixed(2)}
          </p>

          <button
            type="button"
            onClick={payForBorrow}
            disabled={busy}
          >
            {busy
              ? 'Processing...'
              : 'Pay Now'}
          </button>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* HANDOFF - BORROWER */}
      {/* ------------------------------------------------------------- */}

      {request.status ===
        'handoff_pending' &&
        request.handoffStatus !==
          'verified' && (
          <section className="borrow-card">
            <h3>
              Item Handoff
            </h3>

            <p>
              Meet the owner at the confirmed
              handoff time and location.
            </p>

            <p>
              The owner will provide a QR code
              or 6-digit verification code.
            </p>

            <div>
              <button
                type="button"
                onClick={() =>
                  startScanner('handoff')
                }
                disabled={busy}
              >
                Scan Handoff QR
              </button>
            </div>

            <div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value.replace(
                      /\D/g,
                      ''
                    )
                  )
                }
              />

              <button
                type="button"
                onClick={() =>
                  verifyPickup()
                }
                disabled={
                  busy ||
                  code.length !== 6
                }
              >
                Verify Code
              </button>
            </div>
          </section>
        )}

      {/* ------------------------------------------------------------- */}
      {/* HANDOFF - OWNER */}
      {/* ------------------------------------------------------------- */}

      {request.status ===
        'handoff_pending' &&
        request.handoffStatus !==
          'verified' && (
          <section className="borrow-card">
            <h3>
              Owner Handoff Verification
            </h3>

            <p>
              Generate a QR code and 6-digit
              code for the borrower.
            </p>

            <button
              type="button"
              onClick={createHandoff}
              disabled={busy}
            >
              {busy
                ? 'Generating...'
                : 'Generate Handoff QR / Code'}
            </button>

            {qrDataUrl && (
              <div>
                <img
                  src={qrDataUrl}
                  alt="Handoff QR Code"
                  style={{
                    width: 250,
                    height: 250
                  }}
                />
              </div>
            )}

            {code && (
              <div>
                <strong>
                  Handoff Code
                </strong>

                <p
                  style={{
                    fontSize: '2rem',
                    letterSpacing:
                      '0.3rem'
                  }}
                >
                  {code}
                </p>
              </div>
            )}
          </section>
        )}

      {/* ------------------------------------------------------------- */}
      {/* ACTIVE BORROW */}
      {/* ------------------------------------------------------------- */}

      {request.status === 'active' && (
        <section className="borrow-card">
          <h3>
            Item Currently Borrowed
          </h3>

          <p>
            The handoff has been verified.
          </p>

          {request.returnDate && (
            <p>
              Return by:{' '}
              <strong>
                {formatDateTime(
                  request.returnDate
                )}
              </strong>
            </p>
          )}

          <button
            type="button"
            onClick={generateReturn}
            disabled={busy}
          >
            {busy
              ? 'Generating...'
              : 'Generate Return QR / Code'}
          </button>

          {returnQrDataUrl && (
            <div>
              <img
                src={returnQrDataUrl}
                alt="Return QR Code"
                style={{
                  width: 250,
                  height: 250
                }}
              />
            </div>
          )}

          {returnCode && (
            <div>
              <strong>
                Return Code
              </strong>

              <p
                style={{
                  fontSize: '2rem',
                  letterSpacing:
                    '0.3rem'
                }}
              >
                {returnCode}
              </p>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* OVERDUE */}
      {/* ------------------------------------------------------------- */}

      {request.status === 'overdue' && (
        <section className="borrow-card">
          <h3>
            Return Overdue
          </h3>

          <p>
            The return deadline has passed.
          </p>

          <p>
            Late fee:{' '}
            <strong>
              ₹
              {Number(
                request.lateFeeAmount || 0
              ).toFixed(2)}
            </strong>
          </p>

          {request.lateFeePaymentStatus !==
            'captured' && (
            <button
              type="button"
              onClick={payLateFee}
              disabled={busy}
            >
              {busy
                ? 'Processing...'
                : 'Pay Late Fee'}
            </button>
          )}

          {request.lateFeePaymentStatus ===
            'captured' && (
            <button
              type="button"
              onClick={generateReturn}
              disabled={busy}
            >
              Generate Return QR / Code
            </button>
          )}

          {returnQrDataUrl && (
            <div>
              <img
                src={returnQrDataUrl}
                alt="Return QR Code"
                style={{
                  width: 250,
                  height: 250
                }}
              />
            </div>
          )}

          {returnCode && (
            <div>
              <strong>
                Return Code
              </strong>

              <p
                style={{
                  fontSize: '2rem',
                  letterSpacing:
                    '0.3rem'
                }}
              >
                {returnCode}
              </p>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LATE FEE PENDING */}
      {/* ------------------------------------------------------------- */}

      {request.status ===
        'late_fee_pending' && (
        <section className="borrow-card">
          <h3>
            Late Fee Pending
          </h3>

          <p>
            Please complete the late fee
            payment before returning the item.
          </p>

          <p>
            Amount:{' '}
            <strong>
              ₹
              {Number(
                request.lateFeeAmount || 0
              ).toFixed(2)}
            </strong>
          </p>

          <button
            type="button"
            onClick={payLateFee}
            disabled={busy}
          >
            {busy
              ? 'Processing...'
              : 'Pay Late Fee'}
          </button>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LATE FEE PAID */}
      {/* ------------------------------------------------------------- */}

      {request.status ===
        'late_fee_paid' && (
        <section className="borrow-card">
          <h3>
            Late Fee Paid
          </h3>

          <p>
            You can now generate the return
            verification.
          </p>

          <button
            type="button"
            onClick={generateReturn}
            disabled={busy}
          >
            Generate Return QR / Code
          </button>

          {returnQrDataUrl && (
            <div>
              <img
                src={returnQrDataUrl}
                alt="Return QR Code"
                style={{
                  width: 250,
                  height: 250
                }}
              />
            </div>
          )}

          {returnCode && (
            <div>
              <strong>
                Return Code
              </strong>

              <p
                style={{
                  fontSize: '2rem',
                  letterSpacing:
                    '0.3rem'
                }}
              >
                {returnCode}
              </p>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* RETURN VERIFICATION - OWNER */}
      {/* ------------------------------------------------------------- */}

      {[
        'active',
        'overdue',
        'late_fee_paid'
      ].includes(request.status) && (
        <section className="borrow-card">
          <h3>
            Owner Return Verification
          </h3>

          <p>
            When the borrower returns the item,
            scan their return QR or enter their
            return code.
          </p>

          <button
            type="button"
            onClick={() =>
              startScanner('return')
            }
            disabled={busy}
          >
            Scan Return QR
          </button>

          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit return code"
              value={returnCode}
              onChange={(e) =>
                setReturnCode(
                  e.target.value.replace(
                    /\D/g,
                    ''
                  )
                )
              }
            />

            <button
              type="button"
              onClick={() =>
                verifyReturn()
              }
              disabled={
                busy ||
                returnCode.length !== 6
              }
            >
              Verify Return Code
            </button>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SCANNER */}
      {/* ------------------------------------------------------------- */}

      {scanMode && (
        <section className="borrow-card">
          <h3>
            {scanMode === 'handoff'
              ? 'Scan Handoff QR'
              : 'Scan Return QR'}
          </h3>

          <div
            id="borrow-qr-reader"
            style={{
              width: '100%',
              maxWidth: 400
            }}
          />

          <button
            type="button"
            onClick={stopScanner}
          >
            Stop Scanner
          </button>
        </section>
      )}

      {/* ------------------------------------------------------------- */}
      {/* RETURNED */}
      {/* ------------------------------------------------------------- */}

      {request.status === 'returned' && (
        <section className="borrow-card">
          <h3>
            ✓ Item Returned
          </h3>

          <p>
            The owner successfully verified
            the return.
          </p>

          {request.actualReturnDate && (
            <p>
              Actual return time:{' '}
              <strong>
                {formatDateTime(
                  request.actualReturnDate
                )}
              </strong>
            </p>
          )}
        </section>
      )}
    </div>
  );
};

export default BorrowWorkflowPage;