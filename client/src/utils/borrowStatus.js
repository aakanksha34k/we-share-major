// Shared helpers for borrow requests: labels, tones, progress steps and "what happens next".

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

export const formatMoney = (amount) =>
  Number(amount || 0) > 0 ? `₹${Number(amount).toLocaleString('en-IN')}` : 'Free';

// <input type="datetime-local"> wants local time without a timezone suffix.
export const toLocalInput = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

const REQUEST_LABELS = {
  pending: 'Waiting for owner',
  approved: 'Approved',
  return_pending: 'Confirm return date',
  payment_pending: 'Payment due',
  paid: 'Paid',
  handoff_pending: 'Ready for handoff',
  active: 'Borrowed',
  overdue: 'Overdue',
  late_fee_pending: 'Late fee due',
  late_fee_paid: 'Late fee paid',
  returned: 'Returned',
  denied: 'Denied'
};

const ITEM_LABELS = {
  pending: 'Awaiting admin approval',
  available: 'Available',
  reserved: 'Reserved',
  lent: 'Lent out',
  draft: 'Draft',
  removed: 'Removed',
  rejected: 'Rejected by admin'
};

const TONES = {
  pending: 'amber',
  approved: 'blue',
  return_pending: 'amber',
  payment_pending: 'amber',
  paid: 'blue',
  handoff_pending: 'blue',
  active: 'blue',
  overdue: 'red',
  late_fee_pending: 'red',
  late_fee_paid: 'amber',
  returned: 'green',
  denied: 'grey',
  available: 'green',
  reserved: 'amber',
  lent: 'blue',
  draft: 'grey',
  removed: 'grey',
  rejected: 'red'
};

export const statusLabel = (status, kind = 'request') =>
  (kind === 'item' ? ITEM_LABELS : REQUEST_LABELS)[status] ||
  String(status || '').replaceAll('_', ' ');

export const statusTone = (status, kind = 'request') =>
  kind === 'item' && status === 'pending' ? 'amber' : TONES[status] || 'grey';

// Progress steps shown on the transaction page. Free items skip "Payment".
export const getSteps = (request) => {
  const free = !(Number(request.basePrice) > 0);

  const steps = [
    { key: 'requested', label: 'Requested' },
    { key: 'approved', label: 'Approved' },
    ...(free ? [] : [{ key: 'payment', label: 'Payment' }]),
    { key: 'handoff', label: 'Handoff' },
    { key: 'borrowed', label: 'Borrowed' },
    { key: 'returned', label: 'Returned' }
  ];

  const keyByStatus = {
    pending: 'requested',
    approved: 'approved',
    return_pending: 'approved',
    payment_pending: 'payment',
    paid: 'handoff',
    handoff_pending: 'handoff',
    active: 'borrowed',
    overdue: 'borrowed',
    late_fee_pending: 'borrowed',
    late_fee_paid: 'borrowed',
    returned: 'returned'
  };

  const current = steps.findIndex((s) => s.key === (keyByStatus[request.status] || 'requested'));

  return steps.map((step, index) => ({
    ...step,
    state:
      request.status === 'returned'
        ? 'done'
        : index < current
          ? 'done'
          : index === current
            ? 'current'
            : 'todo'
  }));
};

// One plain sentence telling each person what they should do now.
export const nextStep = (role, r) => {
  const borrower = role === 'borrower';
  const price = formatMoney(r.basePrice);
  const fee = `₹${Number(r.lateFeeAmount || 0)}`;

  switch (r.status) {
    case 'pending':
      return borrower
        ? 'Waiting for the owner to accept one of your 3 proposed times.'
        : 'Choose one of the 3 proposed handoff times to approve, or deny the request.';
    case 'return_pending':
      return borrower
        ? 'Confirm your return date to continue.'
        : 'Waiting for the borrower to confirm the return date.';
    case 'payment_pending':
      return borrower
        ? `Pay ${price} to confirm this booking.`
        : 'Waiting for the borrower to pay. The booking is released if they don’t pay in 30 minutes.';
    case 'handoff_pending':
      return borrower
        ? 'Meet the owner, then scan their QR code or type their 6-digit code.'
        : 'When you meet the borrower, generate a QR code and show it to them.';
    case 'active':
      return borrower
        ? `Enjoy it! Return by ${formatDateTime(r.returnDate)}.`
        : `The item is with the borrower until ${formatDateTime(r.returnDate)}.`;
    case 'overdue':
    case 'late_fee_pending':
      return borrower
        ? `This is overdue. Pay the late fee (${fee}), then return the item.`
        : `Overdue. A late fee of ${fee} is currently due from the borrower.`;
    case 'late_fee_paid':
      return borrower
        ? 'Late fee paid. Return the item to the owner.'
        : 'The borrower paid the late fee. Waiting for the item to come back.';
    case 'returned':
      return 'All done. The item is back with its owner.';
    case 'denied':
      return 'This request was closed.';
    default:
      return '';
  }
};
