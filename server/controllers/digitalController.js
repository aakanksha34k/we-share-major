const mongoose = require('mongoose');
const multer = require('multer');

const DigitalResource = require('../models/DigitalResource');
const User = require('../models/User');

const { DIGITAL_TYPES } = DigitalResource;

const MAX_FILE_MB = 15;

/* ------------------------------------------------------------------ */
/* GridFS helpers (files stay in MongoDB, so they survive Render's     */
/* ephemeral disk)                                                     */
/* ------------------------------------------------------------------ */
const getBucket = () =>
  new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'digitalFiles'
  });

const saveToGridFS = (buffer, filename) =>
  new Promise((resolve, reject) => {
    const stream = getBucket().openUploadStream(filename, {
      contentType: 'application/pdf'
    });
    stream.on('error', reject);
    stream.on('finish', () => resolve(stream.id));
    stream.end(buffer);
  });

const removeFile = async (fileId) => {
  try {
    await getBucket().delete(new mongoose.Types.ObjectId(String(fileId)));
  } catch (error) {
    // File already gone: nothing to clean up.
    if (!/FileNotFound/i.test(error.name + error.message)) {
      console.error('GridFS delete error:', error.message);
    }
  }
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const asPublic = (doc) => {
  const out = doc.toObject ? doc.toObject() : { ...doc };
  delete out.fileId;
  return out;
};

/* ------------------------------------------------------------------ */
/* Upload middleware (multipart, PDF only, kept in memory)             */
/* ------------------------------------------------------------------ */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    return cb(new Error('Only PDF files are allowed.'));
  }
});

const uploadSingle = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: `This PDF is larger than ${MAX_FILE_MB} MB. Compress it or split it into parts.`
      });
    }

    return res.status(400).json({ message: error.message || 'Upload failed.' });
  });
};

/* ------------------------------------------------------------------ */
/* CREATE                                                              */
/* ------------------------------------------------------------------ */
const createResource = async (req, res) => {
  let fileId = null;

  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'Choose a PDF file to upload.' });
    }

    // A real PDF starts with "%PDF-". Stops renamed .exe/.zip files.
    if (file.buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
      return res.status(400).json({ message: 'That file is not a valid PDF.' });
    }

    const title = req.body.title?.trim() || '';
    const subject = req.body.subject?.trim() || '';
    const description = req.body.description?.trim() || '';
    const type = req.body.type;

    if (title.length < 3 || title.length > 120) {
      return res.status(400).json({ message: 'Title must be between 3 and 120 characters.' });
    }
    if (!subject || subject.length > 80) {
      return res.status(400).json({ message: 'Subject is required (max 80 characters).' });
    }
    if (description.length > 1000) {
      return res.status(400).json({ message: 'Description can be at most 1000 characters.' });
    }
    if (!DIGITAL_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Choose a valid resource type.' });
    }
    if (req.body.rights !== 'true') {
      return res.status(400).json({
        message: 'Confirm that you have the right to share this file.'
      });
    }

    const user = await User.findById(req.user.id).select('college');

    fileId = await saveToGridFS(file.buffer, file.originalname || `${title}.pdf`);

    const resource = await DigitalResource.create({
      title,
      subject,
      description,
      type,
      university: user?.college || '',
      uploader: req.user.id,
      fileId,
      fileName: file.originalname || '',
      fileSize: file.size
    });

    await resource.populate('uploader', 'fullName college profilePicture');

    return res.status(201).json({
      message: 'Uploaded. Your PDF is now available to every student.',
      resource: asPublic(resource)
    });
  } catch (error) {
    console.error('createResource error:', error);

    // Don't leave an orphan file behind if saving the record failed.
    if (fileId) await removeFile(fileId);

    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Please check the resource details.' });
    }
    return res.status(500).json({ message: 'Could not upload the file. Please try again.' });
  }
};

/* ------------------------------------------------------------------ */
/* LIST  (?type=&search=&sort=newest|downloads&mine=true&page=&limit=) */
/* ------------------------------------------------------------------ */
const listResources = async (req, res) => {
  try {
    const { type, search, sort = 'downloads', mine } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 24));

    const filter = { status: 'published' };

    if (type && DIGITAL_TYPES.includes(type)) filter.type = type;
    if (mine === 'true') filter.uploader = req.user.id;

    if (typeof search === 'string' && search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim().slice(0, 100)), 'i');
      filter.$or = [{ title: rx }, { subject: rx }, { description: rx }];
    }

    const sortMap = {
      newest: { createdAt: -1 },
      downloads: { downloads: -1, createdAt: -1 }
    };

    const [resources, total] = await Promise.all([
      DigitalResource.find(filter)
        .select('-fileId')
        .populate('uploader', 'fullName college profilePicture')
        .sort(sortMap[sort] || sortMap.downloads)
        .skip((page - 1) * limit)
        .limit(limit),
      DigitalResource.countDocuments(filter)
    ]);

    return res.json({
      resources,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit))
    });
  } catch (error) {
    console.error('listResources error:', error);
    return res.status(500).json({ message: 'Could not load resources.' });
  }
};

/* ------------------------------------------------------------------ */
/* STATS (counts per type for the category cards)                      */
/* ------------------------------------------------------------------ */
const getStats = async (req, res) => {
  try {
    const rows = await DigitalResource.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const counts = Object.fromEntries(DIGITAL_TYPES.map((t) => [t, 0]));
    let total = 0;

    for (const row of rows) {
      if (row._id in counts) counts[row._id] = row.count;
      total += row.count;
    }

    return res.json({ counts, total });
  } catch (error) {
    console.error('getStats error:', error);
    return res.status(500).json({ message: 'Could not load resource counts.' });
  }
};

/* ------------------------------------------------------------------ */
/* DOWNLOAD                                                            */
/* ------------------------------------------------------------------ */
const downloadResource = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    const resource = await DigitalResource.findOne({
      _id: req.params.id,
      status: 'published'
    });

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found. It may have been removed.' });
    }

    const bucket = getBucket();
    const [file] = await bucket.find({ _id: resource.fileId }).limit(1).toArray();

    if (!file) {
      return res.status(404).json({ message: 'The file for this resource is missing.' });
    }

    await DigitalResource.updateOne({ _id: resource._id }, { $inc: { downloads: 1 } });

    const asciiName = (resource.title.replace(/[^\w\- ]+/g, '').trim() || 'resource').slice(0, 80);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': file.length,
      'Content-Disposition':
        `attachment; filename="${asciiName}.pdf"; ` +
        `filename*=UTF-8''${encodeURIComponent(resource.title)}.pdf`
    });

    const stream = bucket.openDownloadStream(resource.fileId);

    stream.on('error', (error) => {
      console.error('Download stream error:', error.message);
      if (!res.headersSent) res.status(500).json({ message: 'Download failed.' });
      else res.destroy(error);
    });

    stream.pipe(res);
  } catch (error) {
    console.error('downloadResource error:', error);
    if (!res.headersSent) res.status(500).json({ message: 'Download failed.' });
  }
};

/* ------------------------------------------------------------------ */
/* DELETE (uploader or admin)                                          */
/* ------------------------------------------------------------------ */
const deleteResource = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    const resource = await DigitalResource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    const isOwner = String(resource.uploader) === String(req.user.id);

    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete your own uploads.' });
    }

    await removeFile(resource.fileId);
    await DigitalResource.findByIdAndDelete(resource._id);

    return res.json({ message: 'Resource deleted.' });
  } catch (error) {
    console.error('deleteResource error:', error);
    return res.status(500).json({ message: 'Could not delete the resource.' });
  }
};

/* Used by adminController.deleteUser so a deleted student leaves no orphan PDFs. */
const removeResourcesByUploader = async (userId) => {
  const resources = await DigitalResource.find({ uploader: userId }).select('fileId');
  for (const resource of resources) await removeFile(resource.fileId);
  await DigitalResource.deleteMany({ uploader: userId });
};

module.exports = {
  MAX_FILE_MB,
  uploadSingle,
  createResource,
  listResources,
  getStats,
  downloadResource,
  deleteResource,
  removeResourcesByUploader
};
