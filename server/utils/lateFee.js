const DAY = 24 * 60 * 60 * 1000;
const LATE_STATUSES = ['active', 'overdue', 'late_fee_pending', 'late_fee_paid'];

// Each started 24h after the due time (returnDate) counts as one late day.
const computeLateFee = (request, now = new Date()) => {
  const due = request.returnDate ? new Date(request.returnDate) : null;
  if (!due || now <= due) return { daysLate: 0, total: 0, outstanding: 0 };

  const daysLate = Math.ceil((now - due) / DAY);
  const total = daysLate * Number(request.lateFeePerDay || 20);
  const outstanding = Math.max(0, total - Number(request.lateFeePaidAmount || 0));
  return { daysLate, total, outstanding };
};

// Updates the request in memory (caller saves). Returns the calculation.
const applyLateFee = (request, now = new Date()) => {
  const result = computeLateFee(request, now);
  if (result.daysLate === 0 || !LATE_STATUSES.includes(request.status)) return result;

  request.lateFeeAmount = result.outstanding;
  request.status = result.outstanding > 0 ? 'overdue' : 'late_fee_paid';
  request.lateFeePaymentStatus = result.outstanding > 0 ? 'pending' : 'captured';
  return result;
};

module.exports = { DAY, LATE_STATUSES, computeLateFee, applyLateFee };