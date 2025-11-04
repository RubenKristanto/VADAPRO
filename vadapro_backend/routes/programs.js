const express = require('express');
const router = express.Router();
const programController = require('../controllers/programController');

// Program CRUD routes
router.post('/create', programController.createProgram);
router.get('/organization/:organizationId', programController.getOrganizationPrograms);
router.get('/:id', programController.getProgramById);
router.put('/:id', programController.editProgram);
router.delete('/:id', programController.deleteProgram);

module.exports = router;