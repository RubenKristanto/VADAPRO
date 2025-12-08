import express from 'express';
import * as fileController from '../controllers/fileController.js';

const router = express.Router();

router.post('/upload', fileController.uploadCsv);
router.get('/csv/:processId', fileController.getCsvUrl);
router.get('/gridfs/:entryId', fileController.getCsvFromGridFS);
router.get('/download/:fileId', fileController.downloadFile);

export default router;
