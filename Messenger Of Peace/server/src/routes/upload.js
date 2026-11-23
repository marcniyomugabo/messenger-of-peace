const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// POST /upload - Generic file upload for library, information, etc.
router.post('/', authenticate, authorize('super_admin', 'chief', 'media'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    res.status(201).json({
      success: true,
      message: 'File uploaded',
      data: {
        file_path: `/uploads/${req.file.filename}`,
        file_name: req.file.originalname,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

module.exports = router;
