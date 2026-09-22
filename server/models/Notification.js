const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'borrow_request', 'borrow_approved', 'borrow_denied', 'payment_success',
      'handoff_ready', 'handoff_verified', 'borrow_reminder', 'borrow_due',
      'borrow_overdue', 'late_fee_required', 'late_fee_paid', 'borrow_returned',
      'new_message', 'item_approved', 'item_rejected', 'announcement'
    ],
    required: true
  },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  relatedId: { type: mongoose.Schema.Types.ObjectId, required: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
