const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');
const { createComplaint, getMyComplaints, adminList, adminUpdate } = require('../controllers/complaintController');

router.post('/', protect, createComplaint);
router.get('/mine', protect, getMyComplaints);
router.get('/admin/all', protect, admin, adminList);
router.patch('/admin/:id', protect, admin, adminUpdate);

module.exports = router;