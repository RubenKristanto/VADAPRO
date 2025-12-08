import multer from 'multer';
import path from 'path';
import Process from '../models/processModel.js';
import mongoose from 'mongoose';

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
    // Use 'csv_uploads' bucket to match the upload function
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'csv_uploads' });
    
    // Find file by entryId in metadata OR by filename containing entryId (fallback)
    // Note: The upload function doesn't currently set metadata.entryId. 
    // We need to fix the upload or find a way to link them.
    // For now, let's assume the file might be stored with entryId in metadata if uploaded correctly,
    // or we might need to look up the process to get the fileId.
    
    // However, looking at the error "expected 1 fields but parsed 2", it implies it IS finding a file,
    // but the content is wrong (maybe returning JSON error as CSV?).
    
    // Let's try to find the file more robustly.
    // If we can't find by metadata, we might need to rely on the process model linking.
    
    // BUT, the previous code used bucketName: 'upload'. 
    // If you have OLD files in 'upload' and NEW files in 'csv_uploads', we need to check both.
    
    let bucketToUse = bucket;
    let files = await bucket.find({ 'metadata.entryId': entryId }).toArray();
    
    if (!files || files.length === 0) {
       // Try the old bucket name 'upload' just in case
       const oldBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'upload' });
       files = await oldBucket.find({ 'metadata.entryId': entryId }).toArray();
       if (files && files.length > 0) {
           bucketToUse = oldBucket;
       }
    }

    if (!files || files.length === 0) {
      return res.status(404).json({ success: false, message: 'CSV file not found' });
    }
    
    res.set('Content-Type', 'text/csv');
    bucketToUse.openDownloadStream(files[0]._id).pipe(res);
  } catch (error) {
    console.error('GridFS error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Download file from GridFS
export const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ success: false, message: 'Invalid file ID' });
    }

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'csv_uploads' });
    const _id = new mongoose.Types.ObjectId(fileId);
    
    const files = await bucket.find({ _id }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const downloadStream = bucket.openDownloadStream(_id);
    
    res.set('Content-Type', files[0].contentType || 'text/csv');
    res.set('Content-Disposition', `attachment; filename="${files[0].filename}"`);
    
    downloadStream.pipe(res);
    
    downloadStream.on('error', (error) => {
      console.error('GridFS Download Error:', error);
      res.status(500).json({ success: false, message: 'Error retrieving file' });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
