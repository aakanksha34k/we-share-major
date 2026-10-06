const mongoose = require('mongoose');

const DIGITAL_TYPES = ['Notes', 'E-Books', 'Question Papers', 'Other'];

const digitalResourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    type: { type: String, enum: DIGITAL_TYPES, required: true },
    subject: { type: String, required: true, trim: true, maxlength: 80 },

    // Snapshot of the uploader's college at upload time (same idea as Item.university).
    university: { type: String, trim: true, maxlength: 200, default: '' },

    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // The PDF itself lives in GridFS (bucket "digitalFiles"), not in this document.
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    fileName: { type: String, default: '' },
    fileSize: { type: Number, required: true, min: 0 },

    downloads: { type: Number, default: 0, min: 0 },

    // Uploads publish immediately for now. 'pending' is here so an approval step
    // can be switched on later by changing only the default and the admin UI.
    status: { type: String, enum: ['pending', 'published', 'removed'], default: 'published' }
  },
  { timestamps: true }
);

digitalResourceSchema.index({ status: 1, type: 1, createdAt: -1 });
digitalResourceSchema.index({ status: 1, downloads: -1 });
digitalResourceSchema.index({ uploader: 1, createdAt: -1 });

module.exports = mongoose.model('DigitalResource', digitalResourceSchema);
module.exports.DIGITAL_TYPES = DIGITAL_TYPES;
