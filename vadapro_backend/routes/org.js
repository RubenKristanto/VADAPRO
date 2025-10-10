const express = require('express');
const router = express.Router();
const orgController = require('../controllers/orgController');

router.post('/create', orgController.createOrganization);
router.post('/edit', orgController.editOrganization);
router.get('/delete', orgController.deleteOrganization);

module.exports = router;