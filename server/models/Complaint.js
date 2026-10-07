const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  against: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  borrowRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'BorrowRequest', default: null },
  category: { type: String, required: true, enum: ['not_returned', 'item_damaged', 'not_as_described', 'no_show', 'payment_issue', 'harassment', 'other'] },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['open', 'in_review', 'resolved', 'dismissed'], default: 'open' },
  adminNote: { type: String, default: '' },
  resolvedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);