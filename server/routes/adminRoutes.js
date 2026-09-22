const express = require('express');
const router = express.Router();
const { 
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
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

// GET /api/admin/stats
router.get('/stats', protect, admin, getAdminStats);

// GET /api/admin/users
router.get('/users', protect, admin, getAllUsers);

// DELETE /api/admin/users/:id
router.delete('/users/:id', protect, admin, deleteUser);

// PATCH /api/admin/users/:id/role — toggle role
router.patch('/users/:id/role', protect, admin, toggleUserRole);

// PATCH /api/admin/users/:id/ban — toggle ban
router.patch('/users/:id/ban', protect, admin, toggleUserBan);

// GET /api/admin/items/pending
router.get('/items/pending', protect, admin, getPendingItems);

// GET /api/admin/items
router.get('/items', protect, admin, getAllItems);

// PATCH /api/admin/items/:id/status
router.patch('/items/:id/status', protect, admin, updateItemStatus);

// DELETE /api/admin/items/:id
router.delete('/items/:id', protect, admin, deleteItem);

// GET /api/admin/requests
router.get('/requests', protect, admin, getAllRequests);

// DELETE /api/admin/requests/:id
router.delete('/requests/:id', protect, admin, deleteRequest);

// GET /api/admin/messages
router.get('/messages', protect, admin, getMessages);

// POST /api/admin/announce
router.post('/announce', protect, admin, sendAnnouncement);

module.exports = router;
