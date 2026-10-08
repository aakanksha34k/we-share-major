const Notification = require('../models/Notification');

// Latest 30 notifications, plus any UNREAD announcements (so a pinned announcement
// never gets pushed out of the list by newer notifications).
const getMyNotifications = async (req, res) => {
  try {
    const [latest, pinned] = await Promise.all([
      Notification.find({ recipient: req.user.id }).sort({ createdAt: -1 }).limit(30),
      Notification.find({ recipient: req.user.id, type: 'announcement', isRead: false }).sort({ createdAt: -1 }).limit(5)
    ]);

    const merged = new Map();
    [...pinned, ...latest].forEach((n) => merged.set(String(n._id), n));

    res.status(200).json([...merged.values()].sort((a, b) => b.createdAt - a.createdAt));
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    if (notification.recipient.toString() !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

    notification.isRead = true;
    await notification.save();
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Server error marking notification as read' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, isRead: false }, { $set: { isRead: true } });
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error marking all as read' });
  }
};

module.exports = { getMyNotifications, markAsRead, markAllAsRead };
