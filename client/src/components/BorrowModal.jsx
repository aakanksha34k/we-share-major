import React, { useState } from 'react';
import api from '../api';

const BorrowModal = ({ item, onClose, onSuccess }) => {
  const [purpose, setPurpose] = useState('');

  const [handoffOptions, setHandoffOptions] = useState([
    '',
    '',
    ''
  ]);

  const [returnDate, setReturnDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const updateHandoffOption = (index, value) => {
    setHandoffOptions((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const submitRequest = async (e) => {
    e.preventDefault();

    setError('');
    setMessage('');

    if (!purpose.trim()) {
      setError('Please enter the purpose of borrowing.');
      return;
    }

    if (handoffOptions.some((option) => !option)) {
      setError(
        'Please select all 3 handoff date/time options.'
      );
      return;
    }

    if (!returnDate) {
      setError('Please select the return date/time.');
      return;
    }

    const optionTimes = handoffOptions.map((value) =>
      new Date(value).getTime()
    );

    if (new Set(optionTimes).size !== 3) {
      setError(
        'All 3 handoff options must be different.'
      );
      return;
    }

    const now = Date.now();

    if (optionTimes.some((time) => time <= now)) {
      setError(
        'All handoff options must be in the future.'
      );
      return;
    }

    const returnTime = new Date(returnDate).getTime();

    if (returnTime <= now) {
      setError(
        'Return date/time must be in the future.'
      );
      return;
    }

    if (returnTime <= Math.max(...optionTimes)) {
      setError(
        'Return date/time must be after all 3 handoff options.'
      );
      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        '/borrow',
        {
          itemId: item._id,
          purpose: purpose.trim(),

          handoffOptions: handoffOptions.map(
            (dateTime) => ({
              dateTime
            })
          ),

          returnDate
        }
      );

      setMessage(
        response.data?.message ||
          'Borrow request submitted successfully.'
      );

      if (onSuccess) {
        onSuccess(response.data?.request);
      }

      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to submit borrow request.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="borrow-modal-overlay">
      <div className="borrow-modal">
        <div className="borrow-modal-header">
          <div>
            <h2>Request to Borrow</h2>

            {item?.title && (
              <p>{item.title}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={submitRequest}>
          <div className="form-group">
            <label>
              Purpose of borrowing
            </label>

            <textarea
              value={purpose}
              onChange={(e) =>
                setPurpose(e.target.value)
              }
              placeholder="Why do you need this item?"
              maxLength={1000}
              rows={4}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>
              Choose 3 possible handoff times
            </label>

            <p className="form-help">
              The owner will select one of these
              options.
            </p>

            {handoffOptions.map(
              (option, index) => (
                <div
                  className="handoff-option"
                  key={index}
                >
                  <label>
                    Option {index + 1}
                  </label>

                  <input
                    type="datetime-local"
                    value={option}
                    onChange={(e) =>
                      updateHandoffOption(
                        index,
                        e.target.value
                      )
                    }
                    disabled={loading}
                  />
                </div>
              )
            )}
          </div>

          <div className="form-group">
            <label>
              Expected return date & time
            </label>

            <input
              type="datetime-local"
              value={returnDate}
              onChange={(e) =>
                setReturnDate(e.target.value)
              }
              disabled={loading}
            />

            <p className="form-help">
              The return time must be after all
              three handoff options.
            </p>
          </div>

          {item?.pickupLocation && (
            <div className="borrow-location">
              <strong>Pickup location</strong>

              <p>
                {item.pickupLocation.label ||
                  item.pickupLocation.address ||
                  'Pickup location provided by owner'}
              </p>
            </div>
          )}

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

          <div className="borrow-modal-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Sending...'
                : 'Send Borrow Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BorrowModal;