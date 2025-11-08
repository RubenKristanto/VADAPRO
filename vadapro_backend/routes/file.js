const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

router.post('/upload', fileController.uploadCsv);
router.get('/csv/:processId', fileController.getCsvUrl);
router.get('/gridfs/:entryId', fileController.getCsvFromGridFS);

module.exports = router;
