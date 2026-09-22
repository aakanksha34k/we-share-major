const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  borrowRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'BorrowRequest', required: true },
  payer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['borrow', 'late_fee'], required: true },
  amount: { type: Number, min: 0, required: true },
  currency: { type: String, default: 'INR' },
  provider: { type: String, default: 'razorpay_test' },
  razorpayOrderId: { type: String, required: true },
  razorpayPaymentId: { type: String, default: null },
  status: { type: String, enum: ['created', 'captured', 'failed'], default: 'created' }
}, { timestamps: true });

paymentSchema.index({ razorpayOrderId: 1 }, { unique: true });

module.exports = mongoose.model('Payment', paymentSchema);
