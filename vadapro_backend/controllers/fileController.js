import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Process from '../models/processModel.js';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads/csv');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files allowed'));
    }
  }
}).single('file');

export const uploadCsv = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    try {
      const csvUrl = `${req.protocol}://${req.get('host')}/uploads/csv/${req.file.filename}`;
      const processId = req.body.processId;
      
      if (processId) {
        await Process.findByIdAndUpdate(processId, { csvUrl });
      }
      
      res.json({ success: true, csvUrl, filename: req.file.filename });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
};

export const getCsvUrl = async (req, res) => {
  try {
    const process = await Process.findById(req.params.processId);
    if (!process || !process.csvUrl) {
      return res.status(404).json({ success: false, message: 'CSV not found' });
    }
    res.json({ success: true, csvUrl: process.csvUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Serve CSV from GridFS by entry ID
export const getCsvFromGridFS = async (req, res) => {
  try {
    const { entryId } = req.params;
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'upload' });
    
    const files = await bucket.find({ 'metadata.entryId': entryId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ success: false, message: 'CSV file not found' });
    }
    
    res.set('Content-Type', 'text/csv');
    bucket.openDownloadStream(files[0]._id).pipe(res);
  } catch (error) {
    console.error('GridFS error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
