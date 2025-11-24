import express from 'express';
import * as aiController from '../controllers/aiController.js';
import validateInput from '../middleware/validateInput.js';

const router = express.Router();

// POST /ai/analyze - Main endpoint for AI data analysis
router.post('/analyze', aiController.analyzeData);

// GET /ai/usage - Get current API usage statistics
router.get('/usage', aiController.getUsageStats);

// GET /ai/model - Get model name
router.get('/model', aiController.getModelName);

export default router;
