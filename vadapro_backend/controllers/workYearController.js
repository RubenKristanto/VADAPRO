const WorkYear = require('../models/workYearModel');
const Program = require('../models/programModel');
const User = require('../models/userModel');
const Membership = require('../models/membershipModel');
const Process = require('../models/processModel');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

// Create work year
exports.createWorkYear = async (req, res) => {
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
exports.getProgramWorkYears = async (req, res) => {
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
exports.getWorkYearById = async (req, res) => {
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
exports.createEntry = async (req, res) => {
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
exports.updateEntry = async (req, res) => {
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
exports.uploadDatasheets = async (req, res) => {
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
    const file = req.files[0]; // Take first file only

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
    await workYear.save();
    
    res.status(200).json({ success: true, message: 'File uploaded', files: [fileMeta] });
  } catch (err) {
    console.error('uploadDatasheets error', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

// Download file from GridFS
exports.downloadFile = async (req, res) => {
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

exports.deleteWorkYear = async (req, res) => {
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
    
    // Cascade delete: Delete all processes for this work year
    await Process.deleteMany({ workYear: id });
    
    // Clean up GridFS files for this work year
    if (workYear.entries && workYear.entries.length > 0) {
      const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'upload' });
      for (const entry of workYear.entries) {
        if (entry.file && entry.file.filename) {
          try {
            const files = await bucket.find({ filename: entry.file.filename }).toArray();
            if (files.length > 0) {
              await bucket.delete(files[0]._id);
            }
          } catch (err) {
            console.error('Error deleting file from GridFS:', err);
          }
        }
      }
    }
    
    // Delete the work year
    await WorkYear.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Work year deleted' });
  } catch (err) {
    console.error('deleteWorkYear error', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

exports.deleteEntry = async (req, res) => {
  try {
    const { id, entryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid workYear id' });
    if (!mongoose.Types.ObjectId.isValid(entryId)) return res.status(400).json({ success: false, message: 'Invalid entry id' });
    const workYear = await WorkYear.findById(id);
    if (!workYear) return res.status(404).json({ success: false, message: 'Work year not found' });
    workYear.entries = workYear.entries.filter(e => e._id.toString() !== entryId);
    await workYear.save();
    res.status(200).json({ success: true, message: 'Entry deleted', workYear });
  } catch (err) {
    console.error('deleteEntry error', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};
