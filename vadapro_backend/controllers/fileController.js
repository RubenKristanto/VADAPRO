import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Process from '../models/processModel.js';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Use memory storage for serverless compatibility (Vercel)
const storage = multer.memoryStorage();

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
      // Use GridFS for file storage instead of local disk
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'csv_uploads' });
      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype
      });
      
      const fileId = uploadStream.id;
      
      uploadStream.end(req.file.buffer);
      
      uploadStream.on('finish', async () => {
        // Generate a URL that points to our download endpoint
        const csvUrl = `${req.protocol}://${req.get('host')}/api/file/download/${fileId}`;
        const processId = req.body.processId;
        
        if (processId) {
          await Process.findByIdAndUpdate(processId, { csvUrl });
        }
        
        res.json({ success: true, csvUrl, filename: req.file.originalname, fileId });
      });
      
      uploadStream.on('error', (error) => {
        console.error('GridFS Upload Error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload file to database' });
      });

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
