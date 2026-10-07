const mongoose = require('mongoose');

const digitalSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, default: '', maxlength: 1000 },
  type: { type: String, required: true, enum: ['Notes', 'PDFs', 'E-Books', 'Question Papers', 'Other'] },
  subject: { type: String, required: true, trim: true, maxlength: 80 },
  university: { type: String, default: '' },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: String,
  mimeType: String,
  size: Number,
  file: { type: Buffer, select: false },
  downloads: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('DigitalResource', digitalSchema);