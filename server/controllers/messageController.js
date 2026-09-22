const Message = require('../models/Message');

const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;

    if (!receiverId || !content?.trim()) {
      return res.status(400).json({
        message: 'Receiver and message content are required'
      });
    }

    const newMessage = new Message({
      sender: req.user.id,
      receiver: receiverId,
      content: content.trim()
    });

    await newMessage.save();

    res.status(201).json(newMessage);
  } catch (err) {
    console.error('Error sending message:', err);

    res.status(500).json({
      message: 'Error sending message'
    });
  }
};

const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const messages = await Message.find({
      $or: [
        {
          sender: currentUserId,
          receiver: userId
        },
        {
          sender: userId,
          receiver: currentUserId
        }
      ]
    }).sort({ createdAt: 1 });

    // Mark messages from the other user as read
    await Message.updateMany(
      {
        sender: userId,
        receiver: currentUserId,
        read: false
      },
      {
        $set: {
          read: true
        }
      }
    );

    res.status(200).json(messages);
  } catch (err) {
    console.error('Error getting conversation:', err);

    res.status(500).json({
      message: 'Error getting conversation'
    });
  }
};

const getConversationsList = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId },
        { receiver: currentUserId }
      ]
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'fullName profilePicture')
      .populate('receiver', 'fullName profilePicture');

    const conversations = new Map();

    messages.forEach((msg) => {
      /*
       * A user may have been deleted after a message
       * was created. In that case Mongoose populate()
       * returns null.
       *
       * Never access ._id until we know the user exists.
       */

      if (!msg.sender || !msg.receiver) {
        return;
      }

      const senderId = msg.sender._id.toString();
      const receiverId = msg.receiver._id.toString();
      const currentId = currentUserId.toString();

      const isSender = senderId === currentId;

      const otherUser = isSender
        ? msg.receiver
        : msg.sender;

      if (!otherUser?._id) {
        return;
      }

      const otherId = otherUser._id.toString();

      if (!conversations.has(otherId)) {
        conversations.set(otherId, {
          user: otherUser,
          lastMessage: msg.content,
          timestamp: msg.createdAt,
          unreadCount:
            !isSender && !msg.read
              ? 1
              : 0
        });
      } else if (!isSender && !msg.read) {
        conversations.get(otherId).unreadCount += 1;
      }
    });

    res.status(200).json(
      Array.from(conversations.values())
    );
  } catch (err) {
    console.error(
      'Error getting conversation list:',
      err
    );

    res.status(500).json({
      message: 'Error getting conversation list'
    });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getConversationsList
};