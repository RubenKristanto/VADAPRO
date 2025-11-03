const WorkYear = require('../models/workYearModel');
const Program = require('../models/programModel');
const User = require('../models/userModel');
const Membership = require('../models/membershipModel');
const mongoose = require('mongoose');
const multer = require('multer');
const { Readable } = require('stream');

// multer memory storage + helper to upload buffer to GridFS
const memoryStorage = multer.memoryStorage();
const uploadDatasheet = multer({ storage: memoryStorage });
const uploadImage = multer({ storage: memoryStorage });

const uploadBufferToGridFS = (buffer, filename, options = {}) => {
    return new Promise((resolve, reject) => {
        try {
            const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
            const uploadStream = bucket.openUploadStream(filename, { metadata: options });
            const readable = new Readable();
            readable.push(buffer);
            readable.push(null);
            readable.pipe(uploadStream)
                .on('error', (err) => reject(err))
                .on('finish', (file) => resolve(file));
        } catch (err) {
            reject(err);
        }
    });
};

// Create a work year for a program
exports.createWorkYear = async (req, res) => {
    try {
        const { programId, year, creatorUsername, notes } = req.body;

        if (!programId || !year || !creatorUsername) {
            return res.status(400).json({ success: false, message: 'programId, year and creatorUsername are required' });
        }

        if (!mongoose.Types.ObjectId.isValid(programId)) {
            return res.status(400).json({ success: false, message: 'Invalid program ID' });
        }

        const program = await Program.findById(programId);
        if (!program) return res.status(404).json({ success: false, message: 'Program not found' });

        const creator = await User.findOne({ username: creatorUsername });
        if (!creator) return res.status(404).json({ success: false, message: 'Creator user not found' });

        // Only organization admins can create work years
        const isAdmin = await Membership.isAdmin(creator._id, program.organization);
        if (!isAdmin) return res.status(403).json({ success: false, message: 'Only organization admins can create work years' });

        const workYear = new WorkYear({ program: programId, year: parseInt(year, 10), notes: notes ? notes.trim() : undefined });
        await workYear.save();

        // Link workYear to program
        program.workYears = program.workYears || [];
        program.workYears.push(workYear._id);
        await program.save();

        const populated = await WorkYear.findById(workYear._id).populate('program', 'name');

        res.status(201).json({ success: true, message: 'Work year created', workYear: populated });
    } catch (err) {
        console.error('Error creating work year:', err);
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: 'A work year for that program and year already exists' });
        }
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// List work years for a program
exports.getProgramWorkYears = async (req, res) => {
    try {
        const { programId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(programId)) {
            return res.status(400).json({ success: false, message: 'Invalid program ID' });
        }
        const workYears = await WorkYear.find({ program: programId }).sort({ year: -1 });
        res.status(200).json({ success: true, workYears });
    } catch (err) {
        console.error('Error fetching work years:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// Get single work year by id
exports.getWorkYearById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid workYear ID' });
        }
        const workYear = await WorkYear.findById(id).populate('program', 'name');
        if (!workYear) return res.status(404).json({ success: false, message: 'Work year not found' });
        res.status(200).json({ success: true, workYear });
    } catch (err) {
        console.error('Error fetching work year:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// Upload datasheets to a workYear (store in GridFS)
exports.uploadDatasheets = [
    uploadDatasheet.array('datasheets', 10),
    async (req, res) => {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid workYear ID' });
            const workYear = await WorkYear.findById(id);
            if (!workYear) return res.status(404).json({ success: false, message: 'Work year not found' });

            if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded' });

            const additions = [];
            for (const f of req.files) {
                const fileDoc = await uploadBufferToGridFS(f.buffer, f.originalname, { originalname: f.originalname, contentType: f.mimetype, workYearId: id, fieldname: f.fieldname, kind: 'datasheet' });
                const add = { filename: fileDoc.filename, originalname: f.originalname, url: `/files/${fileDoc._id}`, uploadedAt: new Date(), gridFsId: fileDoc._id.toString() };
                additions.push(add);
            }

            workYear.datasheets = workYear.datasheets.concat(additions);
            await workYear.save();

            res.status(200).json({ success: true, message: 'Datasheets uploaded', files: additions });
        } catch (err) {
            console.error('Error uploading workYear datasheets:', err);
            res.status(500).json({ success: false, message: 'Server error', error: err.message });
        }
    }
];

// Upload images to a workYear (store in GridFS)
exports.uploadImages = [
    uploadImage.array('images', 20),
    async (req, res) => {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid workYear ID' });
            const workYear = await WorkYear.findById(id);
            if (!workYear) return res.status(404).json({ success: false, message: 'Work year not found' });

            if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No images uploaded' });

            const additions = [];
            for (const f of req.files) {
                const fileDoc = await uploadBufferToGridFS(f.buffer, f.originalname, { originalname: f.originalname, contentType: f.mimetype, workYearId: id, fieldname: f.fieldname, kind: 'image' });
                const add = { filename: fileDoc.filename, originalname: f.originalname, url: `/files/${fileDoc._id}`, uploadedAt: new Date(), gridFsId: fileDoc._id.toString() };
                additions.push(add);
            }

            workYear.images = workYear.images.concat(additions);
            await workYear.save();

            res.status(200).json({ success: true, message: 'Images uploaded', files: additions });
        } catch (err) {
            console.error('Error uploading workYear images:', err);
            res.status(500).json({ success: false, message: 'Server error', error: err.message });
        }
    }
];
