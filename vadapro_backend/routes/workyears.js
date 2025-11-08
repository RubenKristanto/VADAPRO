const express = require('express');
const router = express.Router();
const workYearController = require('../controllers/workYearController');
const multer = require('multer');

// Use memory storage for GridFS
const upload = multer({ storage: multer.memoryStorage() });

// Create work year
router.post('/create', workYearController.createWorkYear);

// Get work years for a program
router.get('/program/:programId', workYearController.getProgramWorkYears);

// Get single work year
router.get('/:id', workYearController.getWorkYearById);

// Upload file to entry
router.post('/:id/entries/:entryId/datasheets', upload.array('datasheets', 1), workYearController.uploadDatasheets);

// Create an entry for a work year
router.post('/:id/entries', workYearController.createEntry);

// Update an entry
router.put('/:id/entries/:entryId', workYearController.updateEntry);

// Download file from GridFS
router.get('/files/:fileId', workYearController.downloadFile);

// Delete work year (admin only)
router.delete('/:id', workYearController.deleteWorkYear);

// Delete entry
router.delete('/:id/entries/:entryId', workYearController.deleteEntry);

module.exports = router;
