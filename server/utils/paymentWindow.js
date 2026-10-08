// How long a borrower/buyer has to pay after the owner approves.
//   purchases (items for sale): 48 hours   (env PURCHASE_PAYMENT_HOURS)
//   borrows (items for lending): 30 minutes (env BORROW_PAYMENT_MINUTES)
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const paymentWindowMs = (request) =>
  request.type === 'purchase'
    ? Number(process.env.PURCHASE_PAYMENT_HOURS || 48) * HOUR
    : Number(process.env.BORROW_PAYMENT_MINUTES || 30) * MIN;

const humanDuration = (ms) => {
  if (ms >= 2 * HOUR) return `${Math.round(ms / HOUR)} hours`;
  return `${Math.max(1, Math.round(ms / MIN))} minutes`;
};

module.exports = { MIN, HOUR, paymentWindowMs, humanDuration };
