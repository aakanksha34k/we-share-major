// server/controllers/notificationController.js
const Notification = require('../models/Notification');

// Get all notifications for user
const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    notification.isRead = true;
    await notification.save();
    
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Server error marking notification as read' });
  }
};

// Mark all as read
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error marking all as read' });
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead
};
