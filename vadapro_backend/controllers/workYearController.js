const WorkYear = require('../models/workYearModel');
const Program = require('../models/programModel');
const User = require('../models/userModel');
const Membership = require('../models/membershipModel');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Create work year
exports.createWorkYear = async (req, res) => {
  try {
    const { programId, year, creatorUsername } = req.body;

    if (!programId || !year || !creatorUsername) {
      return res.status(400).json({ success: false, message: 'programId, year and creatorUsername are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(programId)) {
      return res.status(400).json({ success: false, message: 'Invalid programId' });
    }

    const program = await Program.findById(programId);
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });

    const creator = await User.findOne({ username: creatorUsername });
    if (!creator) return res.status(404).json({ success: false, message: 'Creator not found' });

    // only admins can create work years
    const isAdmin = await Membership.isAdmin(creator._id, program.organization);
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Only admins can create work years' });

    const workYear = new WorkYear({ program: programId, year: parseInt(year, 10), createdBy: creator._id });
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

    const workYear = await WorkYear.findById(id).populate('createdBy', 'username');
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

// Helper to ensure upload dir
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Upload datasheets (accept multiple files)
exports.uploadDatasheets = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

    const workYear = await WorkYear.findById(id);
    if (!workYear) return res.status(404).json({ success: false, message: 'Work year not found' });

    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded' });

    const uploadDir = path.join(__dirname, '..', 'uploads', 'workyears', id);
    ensureDir(uploadDir);

    const saved = [];
    for (const f of req.files) {
      const target = path.join(uploadDir, f.filename);
      // file already saved by multer.diskStorage to tmp location or with original name; multer configured in route
      // Move/rename handled by multer's destination in route; here we just build meta
      const meta = {
        filename: f.filename,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        url: `/uploads/workyears/${id}/${f.filename}`
      };
      workYear.datasheets.push(meta);
      saved.push(meta);
    }

    await workYear.save();

    res.status(200).json({ success: true, message: 'Datasheets uploaded', files: saved });

  } catch (err) {
    console.error('uploadDatasheets error', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

// Upload images
exports.uploadImages = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

    const workYear = await WorkYear.findById(id);
    if (!workYear) return res.status(404).json({ success: false, message: 'Work year not found' });

    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded' });

    const uploadDir = path.join(__dirname, '..', 'uploads', 'workyears', id);
    ensureDir(uploadDir);

    const saved = [];
    for (const f of req.files) {
      const meta = {
        filename: f.filename,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        url: `/uploads/workyears/${id}/${f.filename}`
      };
      workYear.images.push(meta);
      saved.push(meta);
    }

    await workYear.save();

    res.status(200).json({ success: true, message: 'Images uploaded', files: saved });

  } catch (err) {
    console.error('uploadImages error', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};
