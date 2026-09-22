// server/controllers/userController.js
const User = require('../models/User');

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { fullName, college, major, graduationYear } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (fullName) user.fullName = fullName;
    if (college) user.college = college;
    if (major) user.major = major;
    if (graduationYear) user.graduationYear = graduationYear;

    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        college: user.college,
        major: user.major,
        graduationYear: user.graduationYear,
        rating: user.rating,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

module.exports = {
  getProfile,
  updateProfile
};
