const express = require('express');
const router = express.Router();
const workYearController = require('../controllers/workYearController');

// Create a work year
router.post('/create', workYearController.createWorkYear);

// List work years for a program
router.get('/program/:programId', workYearController.getProgramWorkYears);

// Get single work year
router.get('/:id', workYearController.getWorkYearById);

// Upload datasheets and images for a work year
router.post('/:id/datasheets', workYearController.uploadDatasheets);
router.post('/:id/images', workYearController.uploadImages);

module.exports = router;
