const mongoose = require('mongoose');

const handoffOptionSchema = new mongoose.Schema({ dateTime: { type: Date, required: true } }, { _id: false });

const pickupLocationSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  },
  { _id: false }
);

const borrowRequestSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    borrower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // 'borrow' = item for lending, 'purchase' = item for sale
    type: { type: String, enum: ['borrow', 'purchase'], default: 'borrow' },

    purpose: { type: String, required: true, trim: true, maxlength: 1000 },
    basePrice: { type: Number, min: 0, required: true, default: 0 },
    lateFeePerDay: { type: Number, min: 0, required: true, default: 20 },
    pickupLocation: { type: pickupLocationSchema, default: null },

    // Borrower proposes exactly 3 possible handoff times; owner chooses one.
    handoffOptions: {
      type: [handoffOptionSchema],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 3,
        message: 'Exactly 3 handoff options are required.'
      }
    },
    selectedHandoffAt: { type: Date, default: null },

    requestedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date, default: null },

    // Deadline for paying after approval (48 h for purchases, 30 min for borrows).
    paymentDueAt: { type: Date, default: null },

    // Borrower's expected return date/time. It becomes the real due time at handoff.
    returnDate: { type: Date, default: null },
    plannedReturnDate: { type: Date, default: null },
    actualReturnDate: { type: Date, default: null },

    status: {
      type: String,
      enum: [
        'pending', 'approved', 'return_pending', 'payment_pending', 'paid', 'handoff_pending',
        'active', 'overdue', 'late_fee_pending', 'late_fee_paid', 'returned', 'completed', 'denied'
      ],
      default: 'pending',
      index: true
    },

    // Handoff verification
    handoffStatus: { type: String, enum: ['not_ready', 'ready', 'verified'], default: 'not_ready' },
    handoffTokenHash: { type: String, default: null },
    handoffTokenExpiresAt: { type: Date, default: null },
    handoffCodeHash: { type: String, default: null },
    handoffCodeExpiresAt: { type: Date, default: null },
    handoffVerifiedAt: { type: Date, default: null },

    // Return verification
    returnTokenHash: { type: String, default: null },
    returnTokenExpiresAt: { type: Date, default: null },
    returnCodeHash: { type: String, default: null },
    returnCodeExpiresAt: { type: Date, default: null },
    returnVerifiedAt: { type: Date, default: null },

    // Main payment
    paymentStatus: { type: String, enum: ['not_required', 'pending', 'captured', 'failed'], default: 'not_required' },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },

    // Late fee
    lateFeeAmount: { type: Number, min: 0, default: 0 },
    // BUG FIX: this field was used by lateFee.js / paymentController.js but missing here,
    // so Mongoose silently dropped it and paid late fees were charged again.
    lateFeePaidAmount: { type: Number, min: 0, default: 0 },
    lateFeePaymentStatus: { type: String, enum: ['not_required', 'pending', 'captured', 'failed'], default: 'not_required' },
    lateFeeRazorpayOrderId: { type: String, default: null },
    lateFeeRazorpayPaymentId: { type: String, default: null },
    lastOverdueReminderDay: { type: String, default: null },

    // Reminder bookkeeping (each reminder is sent only once)
    reminderTomorrowSent: { type: Boolean, default: false },
    reminderTodaySent: { type: Boolean, default: false },
    reminderSoonSent: { type: Boolean, default: false },
    overdueNotificationSent: { type: Boolean, default: false },
    paymentReminders: { type: Number, default: 0 },
    handoffReminderSent: { type: Boolean, default: false },
    ownerReminderSent: { type: Boolean, default: false }
  },
  { timestamps: true }
);

borrowRequestSchema.index({ borrower: 1, status: 1 });
borrowRequestSchema.index({ lender: 1, status: 1 });
borrowRequestSchema.index({ returnDate: 1, status: 1 });
borrowRequestSchema.index({ selectedHandoffAt: 1, status: 1 });
borrowRequestSchema.index({ paymentDueAt: 1, status: 1 });

module.exports = mongoose.model('BorrowRequest', borrowRequestSchema);
