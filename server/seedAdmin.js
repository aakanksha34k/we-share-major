require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    if (!process.env.MONGODB_URI || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      throw new Error('MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    }
    await mongoose.connect(process.env.MONGODB_URI);

    const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      console.log('Admin already exists.');
      return;
    }

    const password = process.env.ADMIN_PASSWORD;
    if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');

    const adminUser = await User.create({
      fullName: process.env.ADMIN_NAME || 'Administrator',
      email: adminEmail,
      password: await bcrypt.hash(password, 12),
      role: 'admin',
      isVerified: true
    });
    console.log(`Admin created: ${adminUser.email}`);
  } catch (err) {
    console.error('Admin seed error:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedAdmin();
