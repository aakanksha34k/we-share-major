const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const DigitalResource = require('../models/DigitalResource');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

const EXT = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.epub']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    EXT.has(path.extname(file.originalname).toLowerCase())
      ? cb(null, true)
      : cb(new Error('Allowed files: PDF, DOC, DOCX, PPT, PPTX, TXT, EPUB.'))
});
const handleUpload = (req, res, next) =>
  upload.single('file')(req, res, (err) =>
    err ? res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'File must be 10 MB or smaller.' : err.message }) : next());

const shape = (d) => ({
  _id: d._id, title: d.title, description: d.description, type: d.type, subject: d.subject,
  university: d.university || 'Not specified', uploader: d.uploader?.fullName || 'Student',
  downloads: d.downloads, price: 0, status: d.status, fileName: d.fileName, size: d.size, createdAt: d.createdAt
});

// Approved library
router.get('/', protect, async (req, res) => {
  try {
    const docs = await DigitalResource.find({ status: 'approved' }).select('-file')
      .populate('uploader', 'fullName').sort({ downloads: -1, createdAt: -1 });
    res.json(docs.map(shape));
  } catch { res.status(500).json({ message: 'Could not load resources.' }); }
});

// Upload (goes to pending)
router.post('/', protect, handleUpload, async (req, res) => {
  try {
    const { title, type, subject, description } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Please choose a file.' });
    if (!title?.trim() || !subject?.trim() || !type) return res.status(400).json({ message: 'Title, type and subject are required.' });

    const me = await User.findById(req.user.id).select('college');
    const doc = await DigitalResource.create({
      title: title.trim(), type, subject: subject.trim(), description: (description || '').trim(),
      university: me?.college || '', uploader: req.user.id,
      fileName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size, file: req.file.buffer
    });
    res.status(201).json({ message: 'Uploaded. An admin will review it before it appears in the library.', id: doc._id });
  } catch (error) {
    console.error('Digital upload error:', error);
    res.status(400).json({ message: error.name === 'ValidationError' ? 'Please check the form fields.' : 'Upload failed.' });
  }
});

// Admin: everything
router.get('/admin/all', protect, admin, async (req, res) => {
  const docs = await DigitalResource.find().select('-file').populate('uploader', 'fullName').sort({ createdAt: -1 });
  res.json(docs.map(shape));
});

router.patch('/:id/status', protect, admin, async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
  const doc = await DigitalResource.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-file');
  if (!doc) return res.status(404).json({ message: 'Not found' });
  await Notification.create({
    recipient: doc.uploader, type: 'announcement',
    message: status === 'approved' ? `Your upload "${doc.title}" is now live in the Digital Library.` : `Your upload "${doc.title}" was not approved.`
  });
  res.json(shape(doc));
});

// Download (login required; served as an attachment, never rendered)
router.get('/:id/download', protect, async (req, res) => {
  try {
    const doc = await DigitalResource.findById(req.params.id).select('+file');
    if (!doc) return res.status(404).json({ message: 'Not found' });
    const allowed = doc.status === 'approved' || String(doc.uploader) === req.user.id || req.user.role === 'admin';
    if (!allowed) return res.status(404).json({ message: 'Not found' });

    if (doc.status === 'approved') await DigitalResource.updateOne({ _id: doc._id }, { $inc: { downloads: 1 } });
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.fileName || 'download')}"`,
      'X-Content-Type-Options': 'nosniff'
    });
    res.send(doc.file);
  } catch { res.status(400).json({ message: 'Invalid request.' }); }
});

router.delete('/:id', protect, async (req, res) => {
  const doc = await DigitalResource.findById(req.params.id).select('-file');
  if (!doc) return res.status(404).json({ message: 'Not found' });
  if (String(doc.uploader) !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'Not allowed' });
  await doc.deleteOne();
  res.json({ message: 'Deleted' });
});

module.exports = router;