import express from 'express';
import * as orgController from '../controllers/orgController.js';

const router = express.Router();

// Organization CRUD routes
router.post('/create', orgController.createOrganization);
router.get('/all', orgController.getAllOrganizations);
router.get('/user/:username', orgController.getUserOrganizations);
router.get('/:id', orgController.getOrganizationById);
router.put('/:id', orgController.editOrganization);
router.delete('/:id', orgController.deleteOrganization);

export default router;