const express = require('express');
const router = express.Router();
const {
  createBorrowRequest, getMyRequests, getIncomingRequests, getRequest,
  approveRequest, denyRequest, createHandoff, verifyHandoff,
  createReturnVerification, verifyReturn, markReturned
} = require('../controllers/borrowController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createBorrowRequest);
router.get('/my-requests', protect, getMyRequests);
router.get('/incoming', protect, getIncomingRequests);
router.get('/:id', protect, getRequest);
router.put('/:id/approve', protect, approveRequest);
router.put('/:id/deny', protect, denyRequest);
router.post('/:id/handoff/create', protect, createHandoff);
router.post('/:id/handoff/verify', protect, verifyHandoff);
router.post('/:id/return/create', protect, createReturnVerification);
router.post('/:id/return/verify', protect, verifyReturn);
router.put('/:id/return', protect, markReturned);

module.exports = router;
