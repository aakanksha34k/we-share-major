const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

const createToken = (user) =>
  jwt.sign(
    {
      id: user._id.toString(),
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

const publicUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  college: user.college,
  major: user.major,
  graduationYear: user.graduationYear,
  role: user.role,
  rating: user.rating,
  profilePicture: user.profilePicture,
  isVerified: user.isVerified
});

/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
| Email verification is intentionally disabled for now.
| New Gmail accounts are immediately marked as verified.
*/
const register = async (req, res) => {
  try {
    const fullName = req.body.fullName?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const college = req.body.college?.trim() || '';
    const major = req.body.major?.trim() || '';
    const graduationYear =
      req.body.graduationYear?.toString().trim() || '';

    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: 'Full name, Gmail and password are required'
      });
    }

    if (!email.endsWith('@gmail.com')) {
      return res.status(400).json({
        message: 'Only Gmail addresses are allowed for We Share.'
      });
    }

    if (fullName.length < 2 || fullName.length > 100) {
      return res.status(400).json({
        message: 'Full name must be between 2 and 100 characters'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters'
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: 'Email already registered'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      college,
      major,
      graduationYear,

      // Email verification temporarily disabled.
      isVerified: true,
      emailVerifiedAt: new Date(),

      authProvider: 'local'
    });

    return res.status(201).json({
      message: 'Account created successfully. You can log in now.',
      email: newUser.email
    });
  } catch (error) {
    console.error('Register error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Email already registered'
      });
    }

    return res.status(500).json({
      message: 'Server error during registration'
    });
  }
};

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
| No email verification check for now.
*/
const login = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Gmail and password are required'
      });
    }

    if (!email.endsWith('@gmail.com')) {
      return res.status(400).json({
        message: 'Only Gmail addresses are allowed.'
      });
    }

    const user = await User.findOne({ email });

    if (!user || !user.password) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        message: 'Your account has been banned'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    /*
     * Existing users who were previously unverified are automatically
     * treated as verified while email verification is disabled.
     */
    if (!user.isVerified) {
      user.isVerified = true;
      user.emailVerifiedAt = user.emailVerifiedAt || new Date();
      await user.save();
    }

    return res.status(200).json({
      message: 'Login successful!',
      token: createToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      message: 'Server error during login'
    });
  }
};

/*
|--------------------------------------------------------------------------
| GOOGLE LOGIN / SIGN UP
|--------------------------------------------------------------------------
*/
const googleLogin = async (req, res) => {
  try {
    if (!googleClient || !process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({
        message: 'Google Sign-In is not configured on the server.'
      });
    }

    const credential = req.body.credential;

    if (!credential) {
      return res.status(400).json({
        message: 'Google credential is required.'
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    if (
      !payload?.sub ||
      payload.email?.toLowerCase().endsWith('@gmail.com') !== true ||
      payload.email_verified !== true
    ) {
      return res.status(400).json({
        message: 'A verified Gmail Google account is required.'
      });
    }

    const email = payload.email.toLowerCase();

    /*
     * First try Google ID, then email.
     * This allows an existing normal Gmail account to be
     * linked with Google Sign-In.
     */
    let user = await User.findOne({
      googleId: payload.sub
    });

    if (!user) {
      user = await User.findOne({ email });
    }

    if (user) {
      if (user.isBanned) {
        return res.status(403).json({
          message: 'Your account has been banned'
        });
      }

      user.googleId = payload.sub;

      user.authProvider = user.password
        ? 'both'
        : 'google';

      user.isVerified = true;
      user.emailVerifiedAt =
        user.emailVerifiedAt || new Date();

      if (!user.profilePicture && payload.picture) {
        user.profilePicture = payload.picture;
      }

      await user.save();
    } else {
      user = await User.create({
        fullName:
          payload.name ||
          email.split('@')[0],

        email,

        googleId: payload.sub,

        authProvider: 'google',

        profilePicture: payload.picture || '',

        isVerified: true,

        emailVerifiedAt: new Date()
      });
    }

    return res.json({
      message: 'Google login successful!',
      token: createToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Google login error:', error);

    return res.status(401).json({
      message: 'Google authentication failed.'
    });
  }
};

module.exports = {
  register,
  login,
  googleLogin
};