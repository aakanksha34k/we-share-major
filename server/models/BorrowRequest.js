const mongoose = require('mongoose');

const handoffOptionSchema = new mongoose.Schema(
  {
    dateTime: {
      type: Date,
      required: true
    }
  },
  { _id: false }
);

const borrowRequestSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true
    },

    borrower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    lender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    purpose: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },

    // Commercial terms are frozen when the request is created.
    basePrice: {
      type: Number,
      min: 0,
      required: true,
      default: 0
    },

    lateFeePerDay: {
      type: Number,
      min: 0,
      required: true,
      default: 20
    },

    pickupLocation: {
      label: {
        type: String,
        default: ''
      },

      address: {
        type: String,
        default: ''
      },

      latitude: {
        type: Number,
        default: null
      },

      longitude: {
        type: Number,
        default: null
      }
    },

    /*
     * Borrower proposes up to 3 handoff options.
     * Owner chooses one when accepting the request.
     */
    handoffOptions: {
      type: [handoffOptionSchema],
      default: []
    },

    selectedHandoffAt: {
      type: Date,
      default: null
    },

    requestedAt: {
      type: Date,
      default: Date.now
    },

    approvedAt: {
      type: Date,
      default: null
    },

    /*
     * Return date is NOT known when the borrower first requests the item.
     * Borrower chooses it after owner acceptance.
     */
    returnDate: {
      type: Date,
      default: null
    },

    actualReturnDate: {
      type: Date,
      default: null
    },

    status: {
      type: String,
      enum: [
        'pending',
        'approved',
        'return_pending',
        'payment_pending',
        'paid',
        'handoff_pending',
        'active',
        'overdue',
        'late_fee_pending',
        'late_fee_paid',
        'returned',
        'denied'
      ],
      default: 'pending'
    },

    /*
     * Handoff QR/code
     */
    handoffStatus: {
      type: String,
      enum: ['not_ready', 'ready', 'verified'],
      default: 'not_ready'
    },

    handoffTokenHash: {
      type: String,
      default: null
    },

    handoffTokenExpiresAt: {
      type: Date,
      default: null
    },

    handoffCodeHash: {
      type: String,
      default: null
    },

    handoffCodeExpiresAt: {
      type: Date,
      default: null
    },

    handoffVerifiedAt: {
      type: Date,
      default: null
    },

    /*
     * Return QR/code
     */
    returnTokenHash: {
      type: String,
      default: null
    },

    returnTokenExpiresAt: {
      type: Date,
      default: null
    },

    returnCodeHash: {
      type: String,
      default: null
    },

    returnCodeExpiresAt: {
      type: Date,
      default: null
    },

    returnVerifiedAt: {
      type: Date,
      default: null
    },

    /*
     * Main Razorpay payment
     */
    paymentStatus: {
      type: String,
      enum: [
        'not_required',
        'pending',
        'captured',
        'failed'
      ],
      default: 'pending'
    },

    razorpayOrderId: {
      type: String,
      default: null
    },

    razorpayPaymentId: {
      type: String,
      default: null
    },

    razorpaySignature: {
      type: String,
      default: null
    },

    /*
     * Late fee
     */
    lateFeeAmount: {
      type: Number,
      min: 0,
      default: 0
    },

    lateFeePaidAmount: {
      type: Number,
      min: 0,
      default: 0
    },

    lateFeePaymentStatus: {
      type: String,
      enum: [
        'not_required',
        'pending',
        'captured'
      ],
      default: 'not_required'
    },

    lateFeeRazorpayOrderId: {
      type: String,
      default: null
    },

    lateFeeRazorpayPaymentId: {
      type: String,
      default: null
    },

    /*
     * Notifications/reminders
     */
    reminderTomorrowSent: {
      type: Boolean,
      default: false
    },

    reminderTodaySent: {
      type: Boolean,
      default: false
    },

    overdueNotificationSent: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

borrowRequestSchema.index({
  borrower: 1,
  status: 1
});

borrowRequestSchema.index({
  lender: 1,
  status: 1
});

borrowRequestSchema.index({
  returnDate: 1,
  status: 1
});

borrowRequestSchema.index({
  selectedHandoffAt: 1,
  status: 1
});

module.exports = mongoose.model(
  'BorrowRequest',
  borrowRequestSchema
);