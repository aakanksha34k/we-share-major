const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'borrow_request', 'borrow_approved', 'borrow_denied', 'payment_success',
      'handoff_ready', 'handoff_verified', 'borrow_reminder', 'borrow_due',
      'borrow_overdue', 'complaint_update', 'late_fee_required', 'late_fee_paid', 'borrow_returned',
      'new_message', 'item_approved', 'item_rejected', 'announcement',
      'return_date_confirmed', 'return_verified',
      // new
      'payment_reminder', 'handoff_reminder', 'request_reminder', 'admin_alert'
    ],
    required: true
  },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  relatedId: { type: mongoose.Schema.Types.ObjectId, required: false }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
