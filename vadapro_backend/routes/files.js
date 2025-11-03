const express = require('express');
const router = express.Router();
const filesController = require('../controllers/filesController');

// Stream file by GridFS id
router.get('/:id', filesController.streamFile);

module.exports = router;
