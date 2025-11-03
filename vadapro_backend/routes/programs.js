const express = require('express');
const router = express.Router();
const programController = require('../controllers/programController');

// Program CRUD routes
router.post('/create', programController.createProgram);
router.get('/organization/:organizationId', programController.getOrganizationPrograms);
router.get('/:id', programController.getProgramById);
router.put('/:id', programController.editProgram);
router.delete('/:id', programController.deleteProgram);

// Participant management routes
router.post('/:id/participants/add', programController.addParticipant);
router.post('/:id/participants/remove', programController.removeParticipant);

// File upload routes (datasheets and images)
router.post('/:id/datasheets', programController.uploadDatasheets);
router.post('/:id/images', programController.uploadImages);

module.exports = router;