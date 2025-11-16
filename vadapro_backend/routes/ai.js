const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const validateInput = require('../middleware/validateInput');

// POST /ai/analyze - Main endpoint for AI data analysis
router.post('/analyze', aiController.analyzeData);

// GET /ai/usage - Get current API usage statistics
router.get('/usage', aiController.getUsageStats);

module.exports = router;
