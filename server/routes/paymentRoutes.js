const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createOrder, verifyPayment, createLateFeeOrder, verifyLateFee } = require('../controllers/paymentController');

router.post('/:id/order', protect, createOrder);
router.post('/:id/verify', protect, verifyPayment);
router.post('/:id/late-fee/order', protect, createLateFeeOrder);
router.post('/:id/late-fee/verify', protect, verifyLateFee);

module.exports = router;
