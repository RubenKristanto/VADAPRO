import express from 'express';
import * as authController from '../controllers/authController.js';
import validateInput from '../middleware/validateInput.js';

const router = express.Router();

router.post('/register', validateInput, authController.register);
router.post('/login', validateInput, authController.login);

export default router;