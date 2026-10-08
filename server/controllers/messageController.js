const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');

const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;

    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ message: 'Receiver and message content are required' });
    }
    if (String(receiverId) === String(req.user.id)) {
      return res.status(400).json({ message: 'You cannot message yourself' });
    }

    // Check the recipient BEFORE saving anything.
    const recipient = await User.findById(receiverId).select('_id isBanned');
    if (!recipient) return res.status(404).json({ message: 'Recipient not found' });

    const newMessage = await Message.create({
      sender: req.user.id,
      receiver: receiverId,
      content: content.trim().slice(0, 2000)
    });

    // One unread "new message" notification per sender is enough.
    try {
      const alreadyUnread = await Notification.exists({
        recipient: receiverId, type: 'new_message', relatedId: req.user._id, isRead: false
      });
      if (!alreadyUnread) {
        await Notification.create({
          recipient: receiverId,
          type: 'new_message',
          message: 'You have a new message. Open it to reply.',
          relatedId: req.user._id
        });
      }
    } catch (notificationError) {
      console.error('Message notification error:', notificationError.message);
    }

    return res.status(201).json(newMessage);
  } catch (err) {
    console.error('Error sending message:', err);
    return res.status(500).json({ message: 'Error sending message' });
  }
};

const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ]
    }).sort({ createdAt: 1 });

    await Message.updateMany(
      { sender: userId, receiver: currentUserId, read: false },
      { $set: { read: true } }
    );

    res.status(200).json(messages);
  } catch (err) {
    console.error('Error getting conversation:', err);
    res.status(500).json({ message: 'Error getting conversation' });
  }
};

const getConversationsList = async (req, res) => {
  try {
    const currentId = req.user.id.toString();

    const messages = await Message.find({ $or: [{ sender: currentId }, { receiver: currentId }] })
      .sort({ createdAt: -1 })
      .populate('sender', 'fullName profilePicture')
      .populate('receiver', 'fullName profilePicture');

    const conversations = new Map();

    messages.forEach((msg) => {
      // A user may have been deleted: populate() then returns null.
      if (!msg.sender || !msg.receiver) return;

      const isSender = msg.sender._id.toString() === currentId;
      const otherUser = isSender ? msg.receiver : msg.sender;
      const otherId = otherUser._id.toString();

      if (!conversations.has(otherId)) {
        conversations.set(otherId, {
          user: otherUser,
          lastMessage: msg.content,
          timestamp: msg.createdAt,
          unreadCount: !isSender && !msg.read ? 1 : 0
        });
      } else if (!isSender && !msg.read) {
        conversations.get(otherId).unreadCount += 1;
      }
    });

    res.status(200).json(Array.from(conversations.values()));
  } catch (err) {
    console.error('Error getting conversation list:', err);
    res.status(500).json({ message: 'Error getting conversation list' });
  }
};

module.exports = { sendMessage, getConversation, getConversationsList };
