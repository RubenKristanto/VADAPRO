const express = require('express');
const router = express.Router();
const workYearController = require('../controllers/workYearController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer to store files in uploads/workyears/:id
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const id = req.params.id || 'temp';
    const dir = path.join(__dirname, '..', 'uploads', 'workyears', id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // keep original name with timestamp to avoid collisions
    const name = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    cb(null, name);
  }
});

const upload = multer({ storage });

// Create work year
router.post('/create', workYearController.createWorkYear);

// Get work years for a program
router.get('/program/:programId', workYearController.getProgramWorkYears);

// Get single work year
router.get('/:id', workYearController.getWorkYearById);

// Upload datasheets (multiple files) - frontend sends field name 'datasheets'
router.post('/:id/datasheets', upload.array('datasheets', 20), workYearController.uploadDatasheets);

// Upload images (multiple files) - frontend sends field name 'images'
router.post('/:id/images', upload.array('images', 20), workYearController.uploadImages);

// Create an entry for a work year
router.post('/:id/entries', workYearController.createEntry);

module.exports = router;
