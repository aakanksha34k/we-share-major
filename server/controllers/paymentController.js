const crypto = require('crypto');
const BorrowRequest = require('../models/BorrowRequest');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');

const razorpayBase = 'https://api.razorpay.com/v1';
const razorpayAuth = () => 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');

const razorpayRequest = async (path, options = {}) => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) throw new Error('Razorpay test keys are not configured');
  const response = await fetch(`${razorpayBase}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: razorpayAuth(), ...(options.headers || {}) }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.description || 'Razorpay request failed');
  return data;
};

const createOrder = async (req, res) => {
  try {
    const request = await BorrowRequest.findOne({ _id: req.params.id, borrower: req.user.id });
    if (!request) return res.status(404).json({ message: 'Borrow request not found' });
    if (request.status !== 'payment_pending' || request.paymentStatus !== 'pending') return res.status(400).json({ message: 'This borrow request is not waiting for payment.' });
    if (request.basePrice <= 0) return res.status(400).json({ message: 'This item is free; no payment is required.' });

    if (request.razorpayOrderId) return res.json({ orderId: request.razorpayOrderId, amount: request.basePrice * 100, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID });

    const order = await razorpayRequest('/orders', { method: 'POST', body: JSON.stringify({ amount: Math.round(request.basePrice * 100), currency: 'INR', receipt: `WS-${request._id}`, notes: { borrowRequestId: request._id.toString(), type: 'borrow' } }) });
    request.razorpayOrderId = order.id;
    await request.save();
    await Payment.create({ borrowRequest: request._id, payer: request.borrower, receiver: request.lender, type: 'borrow', amount: request.basePrice, razorpayOrderId: order.id });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error('Create Razorpay order:', error);
    res.status(500).json({ message: error.message || 'Could not create payment order' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const request = await BorrowRequest.findOne({ _id: req.params.id, borrower: req.user.id });
    if (!request) return res.status(404).json({ message: 'Borrow request not found' });
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ message: 'Incomplete Razorpay response' });
    if (request.razorpayOrderId !== razorpay_order_id) return res.status(400).json({ message: 'Payment order mismatch' });

    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (expected !== razorpay_signature) return res.status(400).json({ message: 'Invalid payment signature' });
    const paymentDetails = await razorpayRequest(`/payments/${razorpay_payment_id}`);
    if (paymentDetails.order_id !== razorpay_order_id) return res.status(400).json({ message: 'Payment order verification failed' });
    if (!['captured', 'authorized'].includes(paymentDetails.status)) return res.status(400).json({ message: `Payment is not successful (${paymentDetails.status}).` });
    if (paymentDetails.status === 'authorized') await razorpayRequest(`/payments/${razorpay_payment_id}/capture`, { method: 'POST', body: JSON.stringify({ amount: paymentDetails.amount, currency: paymentDetails.currency }) });

    request.paymentStatus = 'captured';
    request.razorpayPaymentId = razorpay_payment_id;
    request.razorpaySignature = razorpay_signature;
    request.status = 'handoff_pending';
    await request.save();
    await Payment.findOneAndUpdate({ razorpayOrderId: razorpay_order_id }, { $set: { razorpayPaymentId: razorpay_payment_id, status: 'captured' } });
    await Notification.create({ recipient: request.lender, type: 'payment_success', message: `Payment of ₹${request.basePrice} was verified for your resource.`, relatedId: request._id });
    await Notification.create({ recipient: request.borrower, type: 'payment_success', message: `Your payment of ₹${request.basePrice} was verified. Pickup verification is now available.`, relatedId: request._id });
    res.json({ message: 'Payment verified successfully.' });
  } catch (error) {
    console.error('Verify payment:', error);
    res.status(500).json({ message: 'Could not verify payment' });
  }
};

const createLateFeeOrder = async (req, res) => {
  try {
    const request = await BorrowRequest.findOne({ _id: req.params.id, borrower: req.user.id });
    if (!request) return res.status(404).json({ message: 'Borrow request not found' });
    if (!['overdue', 'late_fee_pending'].includes(request.status)) return res.status(400).json({ message: 'Late fee is not currently required.' });
    if (!request.lateFeeAmount || request.lateFeeAmount <= 0) return res.status(400).json({ message: 'No late fee is due.' });
    if (request.lateFeePaymentStatus === 'captured') return res.status(400).json({ message: 'Late fee is already paid.' });

    if (request.lateFeeRazorpayOrderId) return res.json({ orderId: request.lateFeeRazorpayOrderId, amount: request.lateFeeAmount * 100, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID });
    const order = await razorpayRequest('/orders', { method: 'POST', body: JSON.stringify({ amount: Math.round(request.lateFeeAmount * 100), currency: 'INR', receipt: `WS-LATE-${request._id}`, notes: { borrowRequestId: request._id.toString(), type: 'late_fee' } }) });
    request.lateFeeRazorpayOrderId = order.id;
    request.lateFeePaymentStatus = 'pending';
    request.status = 'late_fee_pending';
    await request.save();
    await Payment.create({ borrowRequest: request._id, payer: request.borrower, receiver: request.lender, type: 'late_fee', amount: request.lateFeeAmount, razorpayOrderId: order.id });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error('Create late fee order:', error);
    res.status(500).json({ message: error.message || 'Could not create late fee order' });
  }
};

const verifyLateFee = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const request = await BorrowRequest.findOne({ _id: req.params.id, borrower: req.user.id });
    if (!request) return res.status(404).json({ message: 'Borrow request not found' });
    if (request.lateFeeRazorpayOrderId !== razorpay_order_id) return res.status(400).json({ message: 'Late-fee order mismatch' });
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (expected !== razorpay_signature) return res.status(400).json({ message: 'Invalid payment signature' });
    const paymentDetails = await razorpayRequest(`/payments/${razorpay_payment_id}`);
    if (paymentDetails.order_id !== razorpay_order_id) return res.status(400).json({ message: 'Payment order verification failed' });
    if (!['captured', 'authorized'].includes(paymentDetails.status)) return res.status(400).json({ message: `Payment is not successful (${paymentDetails.status}).` });
    if (paymentDetails.status === 'authorized') await razorpayRequest(`/payments/${razorpay_payment_id}/capture`, { method: 'POST', body: JSON.stringify({ amount: paymentDetails.amount, currency: paymentDetails.currency }) });
    request.lateFeePaymentStatus = 'captured';
    request.lateFeeRazorpayPaymentId = razorpay_payment_id;
    request.lateFeePaidAmount = Number(request.lateFeePaidAmount || 0) + Number(request.lateFeeAmount || 0);
    const paidLateFee =
  Number(request.lateFeeAmount || 0);

request.lateFeePaymentStatus =
  'captured';

request.lateFeeRazorpayPaymentId =
  razorpay_payment_id;

request.lateFeePaidAmount =
  Number(request.lateFeePaidAmount || 0) +
  paidLateFee;

request.lateFeeAmount = 0;

request.status =
  'late_fee_paid';

await request.save();

await Payment.findOneAndUpdate(
  {
    razorpayOrderId:
      razorpay_order_id
  },
  {
    $set: {
      razorpayPaymentId:
        razorpay_payment_id,
      status: 'captured'
    }
  }
);

await Notification.create({
  recipient: request.lender,
  type: 'late_fee_paid',
  message:
    `Late fee of ₹${paidLateFee} was paid.`,
  relatedId: request._id
});
    res.json({ message: 'Late fee payment verified successfully.' });
  } catch (error) {
    console.error('Verify late fee:', error);
    res.status(500).json({ message: 'Could not verify late fee payment' });
  }
};

module.exports = { createOrder, verifyPayment, createLateFeeOrder, verifyLateFee };
