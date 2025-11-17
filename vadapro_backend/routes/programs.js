import express from 'express';
import * as programController from '../controllers/programController.js';

const router = express.Router();

// Program CRUD routes
router.post('/create', programController.createProgram);
router.get('/organization/:organizationId', programController.getOrganizationPrograms);
router.get('/:id', programController.getProgramById);
router.put('/:id', programController.editProgram);
router.delete('/:id', programController.deleteProgram);

export default router;