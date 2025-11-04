const express = require('express');
const router = express.Router();
const processController = require('../controllers/processController');

// Process CRUD routes
router.post('/create', processController.createProcess);
router.get('/all', processController.getAllProcesses);
router.get('/:id', processController.getProcessById);
router.put('/:id', processController.updateProcess);
router.delete('/:id', processController.deleteProcess);

// Chat message management routes
router.post('/:id/chat', processController.addChatMessage);
router.delete('/:id/chat', processController.clearChatHistory);

// Statistical parameters management routes
router.post('/:id/stats', processController.addSelectedStat);
router.delete('/:id/stats/:statId', processController.removeSelectedStat);
router.put('/:id/stats/:statId', processController.updateStatValue);

// Process status and progress management routes
router.put('/:id/progress', processController.updateProgress);
router.put('/:id/status', processController.updateProcessStatus);

module.exports = router;
