const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, minlength: 8, default: null },
  googleId: { type: String, unique: true, sparse: true },
  authProvider: { type: String, enum: ['local', 'google', 'both'], default: 'local' },
  college: { type: String, default: '' },
  major: { type: String, default: '' },
  graduationYear: { type: String, default: '' },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  profilePicture: { type: String, default: '' },
  bio: { type: String, default: '' },
  rating: { type: Number, default: 0 },
  isBanned: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  emailVerifiedAt: { type: Date, default: null },
  verificationTokenHash: { type: String, default: null },
  verificationExpiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
