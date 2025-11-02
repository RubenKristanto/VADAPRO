const express = require('express');
const router = express.Router();
const orgController = require('../controllers/orgController');

// Organization CRUD routes
router.post('/create', orgController.createOrganization);
router.get('/all', orgController.getAllOrganizations);
router.get('/user/:username', orgController.getUserOrganizations);
router.get('/:id', orgController.getOrganizationById);
router.put('/:id', orgController.editOrganization);
router.delete('/:id', orgController.deleteOrganization);

module.exports = router;