const mongoose = require('mongoose');

const DIGITAL_TYPES = ['Notes', 'E-Books', 'Question Papers', 'Other'];

const digitalSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 1000 },
  type: { type: String, required: true, enum: DIGITAL_TYPES },
  subject: { type: String, required: true, trim: true, maxlength: 80 },
  university: { type: String, default: '' },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
  fileName: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 },
  status: { type: String, enum: ['published', 'removed'], default: 'published' }
}, { timestamps: true });

const DigitalResource = mongoose.model('DigitalResource', digitalSchema);
DigitalResource.DIGITAL_TYPES = DIGITAL_TYPES; // digitalController destructures this
module.exports = DigitalResource;