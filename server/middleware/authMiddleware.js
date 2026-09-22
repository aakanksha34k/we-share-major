const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.slice(7).trim();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id role isBanned');

    if (!user) return res.status(401).json({ message: 'User account not found' });
    if (user.isBanned) return res.status(403).json({ message: 'Your account has been banned' });

    // Always trust the current DB role, not an old role embedded in the token.
    req.user = { id: user._id.toString(), _id: user._id, role: user.role };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { protect };
