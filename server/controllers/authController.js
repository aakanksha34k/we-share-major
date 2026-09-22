const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const sendEmail = require('../utils/sendEmail');

const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;
const createToken = (user) => jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
const publicUser = (user) => ({
  id: user._id, fullName: user.fullName, email: user.email, college: user.college,
  major: user.major, graduationYear: user.graduationYear, role: user.role,
  rating: user.rating, profilePicture: user.profilePicture, isVerified: user.isVerified
});
const hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex');
const generateVerificationToken = () => crypto.randomBytes(32).toString('hex');

const register = async (req, res) => {
  try {
    const fullName = req.body.fullName?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const college = req.body.college?.trim() || '';
    const major = req.body.major?.trim() || '';
    const graduationYear = req.body.graduationYear?.toString().trim() || '';

    if (!fullName || !email || !password) return res.status(400).json({ message: 'Full name, Gmail and password are required' });
    if (!email.endsWith('@gmail.com')) return res.status(400).json({ message: 'Only Gmail addresses are allowed for We Share.' });
    if (fullName.length < 2 || fullName.length > 100) return res.status(400).json({ message: 'Full name must be between 2 and 100 characters' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ message: existingUser.isVerified ? 'Email already registered' : 'Email already registered but not verified. Use resend verification.' });

    const verificationToken = generateVerificationToken();
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await User.create({
      fullName, email, password: hashedPassword, college, major, graduationYear,
      isVerified: false,
      verificationTokenHash: hashToken(verificationToken),
      verificationExpiresAt: new Date(Date.now() + 30 * 60 * 1000)
    });

    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    const sent = await sendEmail({
      to: email,
      subject: 'Verify your We Share account',
      text: `Verify your We Share account: ${verifyUrl}`,
      html: `<h2>Welcome to We Share</h2><p>Click the button below to verify your Gmail address.</p><p><a href="${verifyUrl}">Verify Email</a></p><p>This link expires in 30 minutes.</p>`
    });

    if (!sent && process.env.NODE_ENV === 'production') {
      await User.findByIdAndDelete(newUser._id);
      return res.status(500).json({ message: 'Could not send verification email. Please try again.' });
    }

    res.status(201).json({ message: 'Account created. Please verify your Gmail address before logging in.', email });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 11000) return res.status(409).json({ message: 'Email already registered' });
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const token = req.query.token || req.body.token;
    if (!token) return res.status(400).json({ message: 'Verification token is required' });
    const user = await User.findOne({ verificationTokenHash: hashToken(token), verificationExpiresAt: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: 'Verification link is invalid or expired.' });
    user.isVerified = true;
    user.emailVerifiedAt = new Date();
    user.verificationTokenHash = null;
    user.verificationExpiresAt = null;
    await user.save();
    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ message: 'Server error verifying email' });
  }
};

const resendVerification = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email || !email.endsWith('@gmail.com')) return res.status(400).json({ message: 'Enter a valid Gmail address.' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    if (user.isVerified) return res.status(400).json({ message: 'This email is already verified.' });

    const token = generateVerificationToken();
    user.verificationTokenHash = hashToken(token);
    user.verificationExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
    const sent = await sendEmail({
      to: email,
      subject: 'We Share verification email',
      text: `Verify your account: ${verifyUrl}`,
      html: `<p><a href="${verifyUrl}">Verify your We Share account</a></p><p>This link expires in 30 minutes.</p>`
    });
    if (!sent) return res.status(500).json({ message: 'Could not send verification email.' });
    res.json({ message: 'Verification email sent.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error resending verification' });
  }
};

const login = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    if (!email || !password) return res.status(400).json({ message: 'Gmail and password are required' });
    if (!email.endsWith('@gmail.com')) return res.status(400).json({ message: 'Only Gmail addresses are allowed.' });
    const user = await User.findOne({ email });
    if (!user || !user.password) return res.status(401).json({ message: 'Invalid email or password' });
    if (user.isBanned) return res.status(403).json({ message: 'Your account has been banned' });
    if (!user.isVerified) return res.status(403).json({ message: 'Please verify your Gmail address before logging in.' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });
    res.status(200).json({ message: 'Login successful!', token: createToken(user), user: publicUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const googleLogin = async (req, res) => {
  try {
    if (!googleClient || !process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ message: 'Google Sign-In is not configured on the server.' });
    const credential = req.body.credential;
    if (!credential) return res.status(400).json({ message: 'Google credential is required.' });

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.sub || payload.email?.toLowerCase().endsWith('@gmail.com') !== true || payload.email_verified !== true) {
      return res.status(400).json({ message: 'A verified Gmail Google account is required.' });
    }

    const email = payload.email.toLowerCase();
    let user = await User.findOne({ googleId: payload.sub });
    if (!user) user = await User.findOne({ email });

    if (user) {
      if (user.isBanned) return res.status(403).json({ message: 'Your account has been banned' });
      user.googleId = payload.sub;
      user.authProvider = user.password ? 'both' : 'google';
      user.isVerified = true;
      user.emailVerifiedAt = user.emailVerifiedAt || new Date();
      if (!user.profilePicture && payload.picture) user.profilePicture = payload.picture;
      await user.save();
    } else {
      user = await User.create({
        fullName: payload.name || email.split('@')[0],
        email,
        googleId: payload.sub,
        authProvider: 'google',
        profilePicture: payload.picture || '',
        isVerified: true,
        emailVerifiedAt: new Date()
      });
    }

    res.json({ message: 'Google login successful!', token: createToken(user), user: publicUser(user) });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({ message: 'Google authentication failed.' });
  }
};

module.exports = { register, login, verifyEmail, resendVerification, googleLogin };
