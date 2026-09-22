const User = require('../models/User');
const Item = require('../models/Item');
const BorrowRequest = require('../models/BorrowRequest');
const Notification = require('../models/Notification');
const Message = require('../models/Message');

const getAllItems = async (req, res) => {
  try {
    const items = await Item.find().populate('owner', 'fullName email').sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    console.error('getAllItems error:', error);
    res.status(500).json({ message: 'Server error getting all items' });
  }
};

const getPendingItems = async (req, res) => {
  try {
    const items = await Item.find({ status: 'pending' }).populate('owner', 'fullName email').sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    console.error('getPendingItems error:', error);
    res.status(500).json({ message: 'Server error getting pending items' });
  }
};

const updateItemStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['available', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const item = await Item.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Send notification to the item owner
    const message = status === 'available' 
      ? `Good news! Your item "${item.title}" has been approved and is now live on the dashboard.` 
      : `Unfortunately, your item "${item.title}" was rejected by the administration.`;
      
    await Notification.create({
      recipient: item.owner,
      type: status === 'available' ? 'item_approved' : 'item_rejected',
      message
    });

    res.status(200).json(item);
  } catch (error) {
    console.error('updateItemStatus error:', error);
    res.status(500).json({ message: 'Server error updating item status' });
  }
};

const deleteItem = async (req, res) => {
  try {
    const itemId = req.params.id;
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Delete any associated requests
    await BorrowRequest.deleteMany({ item: itemId });
    
    await Item.findByIdAndDelete(itemId);
    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('deleteItem error:', error);
    res.status(500).json({ message: 'Server error deleting item' });
  }
};

const getAllRequests = async (req, res) => {
  try {
    const requests = await BorrowRequest.find()
      .populate('item', 'title')
      .populate('borrower', 'fullName email')
      .populate('lender', 'fullName email')
      .sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    console.error('getAllRequests error:', error);
    res.status(500).json({ message: 'Server error getting all requests' });
  }
};

const deleteRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const request = await BorrowRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    await BorrowRequest.findByIdAndDelete(requestId);
    res.status(200).json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('deleteRequest error:', error);
    res.status(500).json({ message: 'Server error deleting request' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ message: 'Server error getting all users' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent deleting admin users
    if (user.role === 'admin' || user.email === 'admin') {
      return res.status(400).json({ message: 'Cannot delete an admin user' });
    }
    
    // Optional: cleanup user items and requests
    await Item.deleteMany({ owner: userId });
    await BorrowRequest.deleteMany({ borrower: userId });
    await BorrowRequest.deleteMany({ lender: userId });
    
    await User.findByIdAndDelete(userId);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('deleteUser error:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
};

const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalItems = await Item.countDocuments();
    const totalBorrowRequests = await BorrowRequest.countDocuments();
    const activeBorrows = await BorrowRequest.countDocuments({ status: 'approved' });
    const pendingItems = await Item.countDocuments({ status: 'pending' });
    const bannedUsers = await User.countDocuments({ isBanned: true });
    const totalMessages = await Message.countDocuments();

    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('-password');
    const recentItems = await Item.find().sort({ createdAt: -1 }).limit(5).populate('owner', 'fullName');

    res.status(200).json({
      totalUsers,
      totalItems,
      totalBorrowRequests,
      activeBorrows,
      pendingItems,
      bannedUsers,
      totalMessages,
      recentUsers,
      recentItems
    });
  } catch (error) {
    console.error('getAdminStats error:', error);
    res.status(500).json({ message: 'Server error getting admin stats' });
  }
};

// Toggle user role between student and admin
const toggleUserRole = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't allow changing own role
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    const newRole = user.role === 'admin' ? 'student' : 'admin';
    user.role = newRole;
    await user.save();

    res.status(200).json({ message: `User role changed to ${newRole}`, user: { _id: user._id, role: newRole } });
  } catch (error) {
    console.error('toggleUserRole error:', error);
    res.status(500).json({ message: 'Server error toggling user role' });
  }
};

// Toggle user ban status
const toggleUserBan = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't allow banning admins or self
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot ban an admin user' });
    }
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot ban yourself' });
    }

    user.isBanned = !user.isBanned;
    await user.save();

    res.status(200).json({ 
      message: user.isBanned ? 'User has been banned' : 'User has been unbanned', 
      user: { _id: user._id, isBanned: user.isBanned } 
    });
  } catch (error) {
    console.error('toggleUserBan error:', error);
    res.status(500).json({ message: 'Server error toggling user ban' });
  }
};

// Get all messages for admin moderation view
const getMessages = async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('sender', 'fullName email')
      .populate('receiver', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(100);
    res.status(200).json(messages);
  } catch (error) {
    console.error('getMessages error:', error);
    res.status(500).json({ message: 'Server error getting messages' });
  }
};

// Send a broadcast announcement to all users
const sendAnnouncement = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Announcement message is required' });
    }

    const allUsers = await User.find({ role: { $ne: 'admin' } }).select('_id');
    
    const notifications = allUsers.map(user => ({
      recipient: user._id,
      type: 'announcement',
      message: `📢 Admin Announcement: ${message.trim()}`
    }));

    await Notification.insertMany(notifications);

    res.status(200).json({ message: `Announcement sent to ${allUsers.length} users` });
  } catch (error) {
    console.error('sendAnnouncement error:', error);
    res.status(500).json({ message: 'Server error sending announcement' });
  }
};

module.exports = { 
  getAdminStats, 
  getAllUsers, 
  deleteUser, 
  getAllItems, 
  getPendingItems,
  updateItemStatus,
  deleteItem, 
  getAllRequests, 
  deleteRequest,
  toggleUserRole,
  toggleUserBan,
  getMessages,
  sendAnnouncement
};
