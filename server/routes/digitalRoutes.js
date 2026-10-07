const express = require('express');
const router = express.Router();
const DigitalResource = require('../models/DigitalResource');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');
const {
  uploadSingle, createResource, listResources, getStats, downloadResource, deleteResource
} = require('../controllers/digitalController');

// Specific routes BEFORE /:id
router.get('/stats', protect, getStats);

router.get('/admin/all', protect, admin, async (req, res) => {
  try {
    const docs = await DigitalResource.find().select('-fileId')
      .populate('uploader', 'fullName email').sort({ createdAt: -1 });
    res.json(docs);
  } catch { res.status(500).json({ message: 'Could not load resources.' }); }
});

router.get('/', protect, listResources);
router.post('/', protect, uploadSingle, createResource);
router.get('/:id/download', protect, downloadResource);
router.delete('/:id', protect, deleteResource);

module.exports = router;