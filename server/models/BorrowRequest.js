const mongoose = require('mongoose');

const borrowRequestSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  borrower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  purpose: { type: String, required: true, trim: true, maxlength: 1000 },

  // Snapshot the commercial terms at request time. They must not change if the listing changes later.
  basePrice: { type: Number, min: 0, required: true, default: 0 },
  lateFeePerDay: { type: Number, min: 0, required: true, default: 20 },
  pickupLocation: {
    label: { type: String, default: '' },
    address: { type: String, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  },

  requestedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date, default: null },
  returnDate: { type: Date, required: true },
  actualReturnDate: { type: Date, default: null },

  status: {
    type: String,
    enum: [
      'pending', 'approved', 'payment_pending', 'paid', 'handoff_pending',
      'active', 'overdue', 'late_fee_pending', 'late_fee_paid', 'returned', 'denied'
    ],
    default: 'pending'
  },

  handoffStatus: {
    type: String,
    enum: ['not_ready', 'ready', 'verified'],
    default: 'not_ready'
  },
  handoffTokenHash: { type: String, default: null },
  handoffTokenExpiresAt: { type: Date, default: null },
  handoffCodeHash: { type: String, default: null },
  handoffCodeExpiresAt: { type: Date, default: null },
  handoffVerifiedAt: { type: Date, default: null },

  returnTokenHash: { type: String, default: null },
  returnTokenExpiresAt: { type: Date, default: null },
  returnCodeHash: { type: String, default: null },
  returnCodeExpiresAt: { type: Date, default: null },
  returnVerifiedAt: { type: Date, default: null },

  paymentStatus: {
    type: String,
    enum: ['not_required', 'pending', 'captured', 'failed'],
    default: 'pending'
  },
  razorpayOrderId: { type: String, default: null },
  razorpayPaymentId: { type: String, default: null },
  razorpaySignature: { type: String, default: null },

  lateFeeAmount: { type: Number, min: 0, default: 0 },
  lateFeePaidAmount: { type: Number, min: 0, default: 0 },
  lateFeePaymentStatus: {
    type: String,
    enum: ['not_required', 'pending', 'captured'],
    default: 'not_required'
  },
  lateFeeRazorpayOrderId: { type: String, default: null },
  lateFeeRazorpayPaymentId: { type: String, default: null },

  reminderTomorrowSent: { type: Boolean, default: false },
  reminderTodaySent: { type: Boolean, default: false },
  overdueNotificationSent: { type: Boolean, default: false }
}, { timestamps: true });

borrowRequestSchema.index({ borrower: 1, status: 1 });
borrowRequestSchema.index({ lender: 1, status: 1 });
borrowRequestSchema.index({ returnDate: 1, status: 1 });

module.exports = mongoose.model('BorrowRequest', borrowRequestSchema);
