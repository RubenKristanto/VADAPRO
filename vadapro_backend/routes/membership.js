const express = require('express');
const router = express.Router();
const membershipController = require('../controllers/membershipController');

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

module.exports = router;