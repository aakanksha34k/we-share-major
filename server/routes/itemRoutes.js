const express = require('express');
const router = express.Router();
const {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getMyItems
} = require('../controllers/itemController');
const { protect } = require('../middleware/authMiddleware');

// Specific route MUST come before /:id.
router.get('/user/my-items', protect, getMyItems);
router.get('/', getItems);
router.get('/:id', protect, getItemById);

router.post('/', protect, createItem);
router.put('/:id', protect, updateItem);
router.delete('/:id', protect, deleteItem);

module.exports = router;
