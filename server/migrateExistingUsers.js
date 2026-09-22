require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const result = await User.updateMany(
      { isVerified: { $ne: true }, role: { $ne: 'admin' } },
      { $set: { isVerified: true, emailVerifiedAt: new Date() }, $unset: { verificationCode: '', verificationExpires: '' } }
    );
    console.log(`Development migration complete. Marked ${result.modifiedCount} existing users as verified.`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
