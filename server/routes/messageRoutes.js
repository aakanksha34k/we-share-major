// server/routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { sendMessage, getConversation, getConversationsList } = require('../controllers/messageController');

router.post('/', protect, sendMessage);
router.get('/conversations', protect, getConversationsList);
router.get('/:userId', protect, getConversation);

module.exports = router;
