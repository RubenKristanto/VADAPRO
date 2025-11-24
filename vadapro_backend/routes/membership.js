import express from 'express';
import * as membershipController from '../controllers/membershipController.js';

const router = express.Router();

// Invite user to organization
router.post('/invite', membershipController.inviteUser);

// Remove user from organization
router.post('/remove', membershipController.removeUser);

// Change user role in organization
router.post('/change-role', membershipController.changeUserRole);

// Get organization members with roles
router.get('/organization/:organizationId', membershipController.getOrganizationMembers);

// Get user's role in organization
router.get('/role/:organizationId/:username', membershipController.getUserRole);

export default router;