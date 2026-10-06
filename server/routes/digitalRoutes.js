const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const {
  uploadSingle,
  createResource,
  listResources,
  getStats,
  downloadResource,
  deleteResource
} = require('../controllers/digitalController');

// Specific routes MUST come before /:id.
router.get('/stats', protect, getStats);

router.get('/', protect, listResources);
router.post('/', protect, uploadSingle, createResource);

router.get('/:id/download', protect, downloadResource);
router.delete('/:id', protect, deleteResource);

module.exports = router;
