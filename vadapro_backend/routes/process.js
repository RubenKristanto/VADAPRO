const express = require('express');
const router = express.Router();
const processController = require('../controllers/processController');

// Process CRUD routes
router.post('/create', processController.createProcess);
router.get('/all', processController.getAllProcesses);
router.get('/:id', processController.getProcessById);
router.put('/:id', processController.updateProcess);
router.delete('/:id', processController.deleteProcess);

// Query routes
router.get('/program/:programId', processController.getProcessesByProgram);
router.get('/program/:programId/year/:year', processController.getProcessesByProgramAndYear);
router.get('/organization/:organizationId', processController.getProcessesByOrganization);
router.get('/status/:status', processController.getProcessesByStatus);

// Log management routes
router.post('/:id/logs', processController.addLog);
router.get('/:id/logs', processController.getLogs);

// Chat message management routes
router.post('/:id/chat', processController.addChatMessage);
router.get('/:id/chat', processController.getChatMessages);
router.delete('/:id/chat', processController.clearChatHistory);

// Statistical parameters management routes
router.post('/:id/stats', processController.addSelectedStat);
router.get('/:id/stats', processController.getSelectedStats);
router.delete('/:id/stats/:statId', processController.removeSelectedStat);
router.put('/:id/stats/:statId', processController.updateStatValue);

// Process status and progress management routes
router.put('/:id/progress', processController.updateProgress);
router.put('/:id/status', processController.updateProcessStatus);

module.exports = router;
