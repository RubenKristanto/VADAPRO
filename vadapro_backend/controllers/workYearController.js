import WorkYear from '../models/workYearModel.js';
import Program from '../models/programModel.js';
import User from '../models/userModel.js';
import Membership from '../models/membershipModel.js';
import Process from '../models/processModel.js';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Gemini AI with API key
const genai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY
});

// Create work year
export const createWorkYear = async (req, res) => {
  try {
    const { programId, year } = req.body;

    if (!programId || !year) {
      return res.status(400).json({ success: false, message: 'programId and year are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(programId)) {
      return res.status(400).json({ success: false, message: 'Invalid programId' });
    }

    const program = await Program.findById(programId);
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });

    const workYear = new WorkYear({ program: programId, year: parseInt(year, 10) });
    await workYear.save();

    res.status(201).json({ success: true, message: 'Work year created', workYear });
  } catch (err) {
    console.error('createWorkYear error', err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Work year for this program/year already exists' });
    }
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

// Get work years for a program
export const getProgramWorkYears = async (req, res) => {
  try {
    const { programId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(programId)) return res.status(400).json({ success: false, message: 'Invalid programId' });

    const workYears = await WorkYear.find({ program: programId }).select('year _id createdAt').sort({ year: -1 });
    res.status(200).json({ success: true, workYears });
  } catch (err) {
    console.error('getProgramWorkYears error', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

// Get single work year by id
export const getWorkYearById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

    const workYear = await WorkYear.findById(id);
    if (!workYear) return res.status(404).json({ success: false, message: 'Work year not found' });

    res.status(200).json({ success: true, workYear });
  } catch (err) {
    console.error('getWorkYearById error', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

// Create a data entry for a work year
export const createEntry = async (req, res) => {
  try {
    const { id } = req.params; // workYear id
    const { name } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Entry name required' });

    const workYear = await WorkYear.findById(id);
    if (!workYear) return res.status(404).json({ success: false, message: 'Work year not found' });

    const entry = { name: name.trim(), sourceFile: null, responseCount: 0 };
    workYear.entries.push(entry);
    await workYear.save();

    // Return the updated workYear so client can refresh
    const refreshed = await WorkYear.findById(id);
    res.status(201).json({ success: true, message: 'Entry created', workYear: refreshed });
  } catch (err) {
    console.error('createEntry error', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

// Update entry sourceFile
export const updateEntry = async (req, res) => {
  try {
    const { id, entryId } = req.params;
    const { sourceFile } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid workYear id' });
    if (!mongoose.Types.ObjectId.isValid(entryId)) return res.status(400).json({ success: false, message: 'Invalid entry id' });

    const workYear = await WorkYear.findById(id);
    if (!workYear) return res.status(404).json({ success: false, message: 'Work year not found' });

    const entry = workYear.entries.id(entryId);
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });

    if (sourceFile !== undefined) entry.sourceFile = sourceFile;
    await workYear.save();

    res.status(200).json({ success: true, message: 'Entry updated', workYear });
  } catch (err) {
    console.error('updateEntry error', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

// Upload file to GridFS and attach to entry
export const uploadDatasheets = async (req, res) => {
  try {
    const { id, entryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid workYear id' });
    if (!mongoose.Types.ObjectId.isValid(entryId)) return res.status(400).json({ success: false, message: 'Invalid entry id' });

    const workYear = await WorkYear.findById(id);
    if (!workYear) return res.status(404).json({ success: false, message: 'Work year not found' });
    
    const entry = workYear.entries.id(entryId);
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded' });

    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'upload' });
    const file = req.files[0];

    const uploadStream = bucket.openUploadStream(file.originalname, {
      metadata: { workYearId: id, entryId: entryId, mimetype: file.mimetype, size: file.size }
    });
    uploadStream.end(file.buffer);
    
    await new Promise((resolve, reject) => {
      uploadStream.on('finish', () => resolve());
      uploadStream.on('error', reject);
    });

    const fileMeta = {
      filename: uploadStream.id.toString(),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/api/workyears/files/${uploadStream.id}`
    };
    entry.file = fileMeta;
    entry.sourceFile = file.originalname;
    
import os from 'os';

// ... existing imports ...

// Upload file to GridFS and attach to entry
export const uploadDatasheets = async (req, res) => {
  try {
    // ... existing validation ...
    
    // ... GridFS upload code ...
    
    try {
      // FIX: Use os.tmpdir() for Vercel/Serverless compatibility
      const tempPath = path.join(os.tmpdir(), `temp_${Date.now()}_${file.originalname}`);
      await fs.writeFile(tempPath, file.buffer);

      const uploadResult = await genai.files.upload({
        file: tempPath,
        config: {
          mimeType: 'text/csv',
          displayName: file.originalname
        }
      });
      // ... rest of the code ...
      const fileName = uploadResult.name;

      const fetchedFile = await genai.files.get({ name: fileName });
      console.log(fetchedFile);

      entry.geminiFileUri = uploadResult.uri;
      await fs.unlink(tempPath);
      console.log(`✅ Gemini File API upload successful: ${uploadResult.uri}`);
    } catch (geminiErr) {
      console.error('⚠️ Gemini File API upload failed:', geminiErr.message);
    }
    
    await workYear.save();
    
    res.status(200).json({ success: true, message: 'File uploaded', files: [fileMeta] });
  } catch (err) {
    console.error('uploadDatasheets error', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

// Download file from GridFS
export const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'upload' });
    
    const file = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
    if (!file || file.length === 0) return res.status(404).json({ success: false, message: 'File not found' });

    res.set('Content-Type', file[0].metadata?.mimetype || 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${file[0].filename}"`);
    
    bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId)).pipe(res);
  } catch (err) {
    console.error('downloadFile error', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

export const deleteWorkYear = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleterUsername } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const workYear = await WorkYear.findById(id).populate('program');
    if (!workYear) return res.status(404).json({ success: false, message: 'Work year not found' });
    const deleter = await User.findOne({ username: deleterUsername });
    if (!deleter) return res.status(404).json({ success: false, message: 'User not found' });
    const program = await Program.findById(workYear.program._id).populate('organization');
    const isAdmin = await Membership.isAdmin(deleter._id, program.organization._id);
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Only admins can delete work years' });
    
    await Process.deleteMany({ entry: { $in: workYear.entries.map(e => e._id) } });
    
    if (workYear.entries && workYear.entries.length > 0) {
      const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'upload' });
      for (const entry of workYear.entries) {
        if (entry.geminiFileUri) {
          try {
            const fileNameMatch = entry.geminiFileUri.match(/files\/([^\/]+)/);
            if (fileNameMatch && fileNameMatch[1]) {
              await genai.files.delete({ name: fileNameMatch[1] });
              console.log(`✅ Gemini File API deletion successful: ${entry.geminiFileUri}`);
            }
          } catch (geminiErr) {
            console.log(`❌ Gemini File API deletion failed: ${entry.geminiFileUri} - ${geminiErr.message}`);
          }
        }
        if (entry.file && entry.file.filename) {
          try {
            await bucket.delete(new mongoose.Types.ObjectId(entry.file.filename));
          } catch (err) {
            console.error('Error deleting file from GridFS:', err);
          }
        }
      }
    }
    
    await WorkYear.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Work year deleted' });
  } catch (err) {
    console.error('deleteWorkYear error', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

export const deleteEntry = async (req, res) => {
  try {
    const { id, entryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid workYear id' });
    if (!mongoose.Types.ObjectId.isValid(entryId)) return res.status(400).json({ success: false, message: 'Invalid entry id' });
    const workYear = await WorkYear.findById(id);
    if (!workYear) return res.status(404).json({ success: false, message: 'Work year not found' });
    
    const entry = workYear.entries.id(entryId);
    if (entry) {
      if (entry.geminiFileUri) {
        try {
          const fileNameMatch = entry.geminiFileUri.match(/files\/([^\/]+)/);
          if (fileNameMatch && fileNameMatch[1]) {
            await genai.files.delete({ name: fileNameMatch[1] });
            console.log(`✅ Gemini File API deletion successful: ${entry.geminiFileUri}`);
          }
        } catch (geminiErr) {
          console.log(`❌ Gemini File API deletion failed: ${entry.geminiFileUri} - ${geminiErr.message}`);
        }
      }
      if (entry.file && entry.file.filename) {
        const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'upload' });
        try {
          await bucket.delete(new mongoose.Types.ObjectId(entry.file.filename));
        } catch (err) {
          console.error('Error deleting file from GridFS:', err);
        }
      }
    }
    
    await Process.deleteMany({ entry: entryId });
    
    workYear.entries = workYear.entries.filter(e => e._id.toString() !== entryId);
    await workYear.save();
    res.status(200).json({ success: true, message: 'Entry deleted', workYear });
  } catch (err) {
    console.error('deleteEntry error', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

export const reuploadToGemini = async (req, res) => {
  try {
    const { id, entryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid workYear id' });
    if (!mongoose.Types.ObjectId.isValid(entryId)) return res.status(400).json({ success: false, message: 'Invalid entry id' });

    const workYear = await WorkYear.findById(id);
    if (!workYear) return res.status(404).json({ success: false, message: 'Work year not found' });
    
    const entry = workYear.entries.id(entryId);
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    if (!entry.file || !entry.file.filename) return res.status(400).json({ success: false, message: 'No file in GridFS to reupload' });

    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'upload' });
    const fileId = new mongoose.Types.ObjectId(entry.file.filename);

    const chunks = [];
    const downloadStream = bucket.openDownloadStream(fileId);

    await new Promise((resolve, reject) => {
      downloadStream.on('data', chunk => chunks.push(chunk));
      downloadStream.on('end', () => resolve());
      downloadStream.on('error', err => reject(err));
    });

    const fileBuffer = Buffer.concat(chunks);
    // FIX: Use os.tmpdir() for Vercel/Serverless compatibility
    const tempPath = path.join(os.tmpdir(), `temp_${Date.now()}_${entry.sourceFile}`);
    await fs.writeFile(tempPath, fileBuffer);

    const uploadResult = await genai.files.upload({
      file: tempPath,
      config: {
        mimeType: 'text/csv',
        displayName: entry.sourceFile
      }
    });

    entry.geminiFileUri = uploadResult.uri;
    await workYear.save();
    await fs.unlink(tempPath);

    console.log(`✅ Gemini File API re-upload successful: ${uploadResult.uri}`);
    res.status(200).json({ success: true, message: 'File reuploaded to Gemini', geminiFileUri: uploadResult.uri, workYear });
  } catch (err) {
    console.error('reuploadToGemini error', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

export const validateGeminiUri = async (req, res) => {
  try {
    const { id, entryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid workYear id' });
    if (!mongoose.Types.ObjectId.isValid(entryId)) return res.status(400).json({ success: false, message: 'Invalid entry id' });

    const workYear = await WorkYear.findById(id);
    if (!workYear) return res.status(404).json({ success: false, message: 'Work year not found' });
    
    const entry = workYear.entries.id(entryId);
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    if (!entry.geminiFileUri) return res.status(200).json({ success: true, valid: false, message: 'No Gemini URI found' });

    try {
      const fileNameMatch = entry.geminiFileUri.match(/files\/([^\/]+)/);
      if (!fileNameMatch || !fileNameMatch[1]) {
        return res.status(200).json({ success: true, valid: false, message: 'Invalid URI format' });
      }

      const existingFile = await genai.files.get({ name: fileNameMatch[1] });
      if (existingFile && existingFile.state === 'ACTIVE') {
        console.log(`✅ Gemini File API valid: ${entry.geminiFileUri}`);
        return res.status(200).json({ success: true, valid: true, message: 'Gemini file is valid' });
      } else {
        console.log(`⚠️ Gemini File API not active: ${entry.geminiFileUri}`);
        return res.status(200).json({ success: true, valid: false, message: 'Gemini file not active' });
      }
    } catch (checkErr) {
      console.log(`⚠️ Gemini File API validation failed: ${checkErr.message}`);
      return res.status(200).json({ success: true, valid: false, message: 'Gemini file check failed' });
    }
  } catch (err) {
    console.error('validateGeminiUri error', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};
