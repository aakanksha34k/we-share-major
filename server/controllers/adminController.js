const User = require('../models/User');
const Item = require('../models/Item');
const BorrowRequest = require('../models/BorrowRequest');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const Complaint = require('../models/Complaint');
const sendEmail = require('../utils/sendEmail');
const { layout } = require('../utils/notify');
const { clientBase } = require('../utils/clientUrl');
const { removeResourcesByUploader } = require('./digitalController');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    if (!['available', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const item = await Item.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!item) return res.status(404).json({ message: 'Item not found' });

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
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    await BorrowRequest.deleteMany({ item: req.params.id });
    await Item.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('deleteItem error:', error);
    res.status(500).json({ message: 'Server error deleting item' });
  }
};

const getAllRequests = async (req, res) => {
  try {
    const requests = await BorrowRequest.find()
      .populate('item', 'title listingType')
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
    const request = await BorrowRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    await BorrowRequest.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('deleteRequest error:', error);
    res.status(500).json({ message: 'Server error deleting request' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password -resetTokenHash -resetExpiresAt').sort({ createdAt: -1 });
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
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot delete an admin user' });

    await Item.deleteMany({ owner: userId });
    await BorrowRequest.deleteMany({ $or: [{ borrower: userId }, { lender: userId }] });
    await Message.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] });
    await Notification.deleteMany({ recipient: userId });
    await Complaint.deleteMany({ reporter: userId });
    await removeResourcesByUploader(userId);

    await User.findByIdAndDelete(userId);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('deleteUser error:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
};

const getAdminStats = async (req, res) => {
  try {
    const [totalUsers, totalItems, totalBorrowRequests, activeBorrows, pendingItems, bannedUsers, totalMessages, openComplaints] =
      await Promise.all([
        User.countDocuments(),
        Item.countDocuments(),
        BorrowRequest.countDocuments(),
        BorrowRequest.countDocuments({ status: { $in: ['active', 'overdue', 'late_fee_pending', 'late_fee_paid'] } }),
        Item.countDocuments({ status: 'pending' }),
        User.countDocuments({ isBanned: true }),
        Message.countDocuments(),
        Complaint.countDocuments({ status: { $in: ['open', 'in_review'] } })
      ]);

    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('-password -resetTokenHash -resetExpiresAt');
    const recentItems = await Item.find().sort({ createdAt: -1 }).limit(5).populate('owner', 'fullName');

    res.status(200).json({
      totalUsers, totalItems, totalBorrowRequests, activeBorrows, pendingItems,
      bannedUsers, totalMessages, openComplaints, recentUsers, recentItems
    });
  } catch (error) {
    console.error('getAdminStats error:', error);
    res.status(500).json({ message: 'Server error getting admin stats' });
  }
};

const toggleUserRole = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (req.params.id === req.user._id.toString()) return res.status(400).json({ message: 'Cannot change your own role' });

    const newRole = user.role === 'admin' ? 'student' : 'admin';
    user.role = newRole;
    await user.save();

    res.status(200).json({ message: `User role changed to ${newRole}`, user: { _id: user._id, role: newRole } });
  } catch (error) {
    console.error('toggleUserRole error:', error);
    res.status(500).json({ message: 'Server error toggling user role' });
  }
};

const toggleUserBan = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot ban an admin user' });
    if (req.params.id === req.user._id.toString()) return res.status(400).json({ message: 'Cannot ban yourself' });

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

// Broadcast: in-app notification for everyone (shows as a pop-up) and, optionally, an email.
const sendAnnouncement = async (req, res) => {
  try {
    const message = req.body.message?.trim();
    const alsoEmail = Boolean(req.body.alsoEmail);
    if (!message) return res.status(400).json({ message: 'Announcement message is required' });

    const students = await User.find({ role: { $ne: 'admin' }, isBanned: { $ne: true } }).select('_id email');

    await Notification.insertMany(
      students.map((user) => ({
        recipient: user._id,
        type: 'announcement',
        message: `📢 Admin Announcement: ${message}`
      }))
    );

    if (alsoEmail) {
      // Runs in the background (slowly) so the admin does not wait and provider limits are respected.
      (async () => {
        const html = layout({ title: 'Announcement from We Share', body: message, url: clientBase(), label: 'Open We Share' });
        for (const user of students) {
          if (!user.email) continue;
          await sendEmail({ to: user.email, subject: 'Announcement from We Share', text: `${message}\n\n${clientBase()}`, html });
          await sleep(200);
        }
        console.log(`Announcement emails finished (${students.length} recipients).`);
      })().catch((error) => console.error('Announcement email error:', error.message));
    }

    res.status(200).json({
      message: `Announcement sent to ${students.length} students${alsoEmail ? '. Emails are going out in the background.' : '.'}`
    });
  } catch (error) {
    console.error('sendAnnouncement error:', error);
    res.status(500).json({ message: 'Server error sending announcement' });
  }
};

module.exports = {
  getAdminStats, getAllUsers, deleteUser, getAllItems, getPendingItems, updateItemStatus,
  deleteItem, getAllRequests, deleteRequest, toggleUserRole, toggleUserBan, getMessages, sendAnnouncement
};
