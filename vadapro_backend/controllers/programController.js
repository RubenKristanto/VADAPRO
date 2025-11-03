const Program = require('../models/programModel');
const Organization = require('../models/organizationModel');
const User = require('../models/userModel');
const Membership = require('../models/membershipModel');
const mongoose = require('mongoose');
const multer = require('multer');
const { Readable } = require('stream');

// We'll parse uploads into memory and write them into GridFS
const memoryStorage = multer.memoryStorage();
const uploadDatasheet = multer({ storage: memoryStorage });
const uploadImage = multer({ storage: memoryStorage });

// Helper: upload a buffer to MongoDB GridFS and return the file document
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

// Create a new program
exports.createProgram = async (req, res) => {
    try {
        const { name, description, organizationId, creatorUsername, startDate, endDate } = req.body;

        // Validate required fields
        if (!name || !organizationId || !creatorUsername) {
            return res.status(400).json({
                success: false,
                message: 'Program name, organization ID, and creator username are required'
            });
        }

        // Validate organization ID
        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization ID'
            });
        }

        // Find the creator user
        const creator = await User.findOne({ username: creatorUsername });
        if (!creator) {
            return res.status(404).json({
                success: false,
                message: 'Creator user not found'
            });
        }

        // Find the organization
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Check if user is an admin of the organization (only admins can create programs)
        const isAdmin = await Membership.isAdmin(creator._id, organizationId);
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can create programs in this organization'
            });
        }

        // Create the program
        const program = new Program({
            name: name.trim(),
            description: description ? description.trim() : undefined,
            organization: organizationId,
            creator: creator._id,
            participants: [creator._id], // Creator is automatically a participant
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined
        });

        await program.save();

        // Add program to organization's programs list
        await Organization.findByIdAndUpdate(
            organizationId,
            { $addToSet: { programs: program._id } }
        );

        // Populate the response
        const populatedProgram = await Program.findById(program._id)
            .populate('organization', 'name')
            .populate('creator', 'username')
            .populate('participants', 'username');

        res.status(201).json({
            success: true,
            message: 'Program created successfully',
            program: populatedProgram
        });

    } catch (error) {
        console.error('Error creating program:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get all programs for an organization
exports.getOrganizationPrograms = async (req, res) => {
    try {
        const { organizationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization ID'
            });
        }

        const programs = await Program.find({ organization: organizationId })
            .populate('organization', 'name')
            .populate('creator', 'username')
            .populate('participants', 'username')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            programs
        });

    } catch (error) {
        console.error('Error fetching organization programs:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get single program by ID
exports.getProgramById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid program ID'
            });
        }

        const program = await Program.findById(id)
            .populate('organization', 'name')
            .populate('creator', 'username')
            .populate('participants', 'username');

        if (!program) {
            return res.status(404).json({
                success: false,
                message: 'Program not found'
            });
        }

        res.status(200).json({
            success: true,
            program
        });

    } catch (error) {
        console.error('Error fetching program:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Edit program
exports.editProgram = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, editorUsername, startDate, endDate, status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid program ID'
            });
        }

        // Find the program
        const program = await Program.findById(id).populate('organization');
        if (!program) {
            return res.status(404).json({
                success: false,
                message: 'Program not found'
            });
        }

        // Find the editor user
        const editor = await User.findOne({ username: editorUsername });
        if (!editor) {
            return res.status(404).json({
                success: false,
                message: 'Editor user not found'
            });
        }

        // Check if user has permission to edit (must be admin in the organization)
        const isAdmin = await Membership.isAdmin(editor._id, program.organization._id);
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can edit programs in this organization'
            });
        }

        // Update fields if provided
        if (name && name.trim() !== program.name) {
            program.name = name.trim();
        }
        if (description !== undefined) {
            program.description = description ? description.trim() : '';
        }
        if (startDate) {
            program.startDate = new Date(startDate);
        }
        if (endDate) {
            program.endDate = new Date(endDate);
        }
        if (status && ['active', 'completed', 'cancelled', 'pending'].includes(status)) {
            program.status = status;
        }

        await program.save();

        // Populate the response
        const updatedProgram = await Program.findById(id)
            .populate('organization', 'name')
            .populate('creator', 'username')
            .populate('participants', 'username');

        res.status(200).json({
            success: true,
            message: 'Program updated successfully',
            program: updatedProgram
        });

    } catch (error) {
        console.error('Error updating program:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Add participant to program
exports.addParticipant = async (req, res) => {
    try {
        const { id } = req.params;
        const { participantUsername, adderUsername } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid program ID'
            });
        }

        // Find the program
        const program = await Program.findById(id).populate('organization');
        if (!program) {
            return res.status(404).json({
                success: false,
                message: 'Program not found'
            });
        }

        // Find the participant user
        const participant = await User.findOne({ username: participantUsername });
        if (!participant) {
            return res.status(404).json({
                success: false,
                message: 'User to be added not found'
            });
        }

        // Find the adder user
        const adder = await User.findOne({ username: adderUsername });
        if (!adder) {
            return res.status(404).json({
                success: false,
                message: 'Adder user not found'
            });
        }

        // Check if adder has permission (must be organization member)
        const isAdderMember = await Membership.isMember(adder._id, program.organization._id);

        if (!isAdderMember) {
            return res.status(403).json({
                success: false,
                message: 'You must be a member of the organization to add participants to programs'
            });
        }

        // Check if participant is a member of the organization
        const isParticipantMember = await Membership.isMember(participant._id, program.organization._id);

        if (!isParticipantMember) {
            return res.status(400).json({
                success: false,
                message: 'User must be a member of the organization to participate in programs'
            });
        }

        // Check if user is already a participant
        const isAlreadyParticipant = program.participants.some(p => 
            p.toString() === participant._id.toString()
        );

        if (isAlreadyParticipant) {
            return res.status(409).json({
                success: false,
                message: 'User is already a participant in this program'
            });
        }

        // Add participant to program
        program.participants.push(participant._id);
        await program.save();

        // Populate the response
        const updatedProgram = await Program.findById(id)
            .populate('organization', 'name')
            .populate('creator', 'username')
            .populate('participants', 'username');

        res.status(200).json({
            success: true,
            message: 'Participant added successfully',
            program: updatedProgram
        });

    } catch (error) {
        console.error('Error adding participant:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Remove participant from program
exports.removeParticipant = async (req, res) => {
    try {
        const { id } = req.params;
        const { participantUsername, removerUsername } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid program ID'
            });
        }

        // Find the program
        const program = await Program.findById(id).populate('organization');
        if (!program) {
            return res.status(404).json({
                success: false,
                message: 'Program not found'
            });
        }

        // Find the participant to remove
        const participant = await User.findOne({ username: participantUsername });
        if (!participant) {
            return res.status(404).json({
                success: false,
                message: 'Participant to be removed not found'
            });
        }

        // Find the remover user
        const remover = await User.findOne({ username: removerUsername });
        if (!remover) {
            return res.status(404).json({
                success: false,
                message: 'Remover user not found'
            });
        }

        // Check if remover has permission (must be program creator, organization creator, or self-removal)
        const isProgramCreator = program.creator.toString() === remover._id.toString();
        const isOrgCreator = program.organization.creator.toString() === remover._id.toString();
        const isSelfRemoval = participant._id.toString() === remover._id.toString();

        if (!isProgramCreator && !isOrgCreator && !isSelfRemoval) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to remove participants from this program'
            });
        }

        // Cannot remove the program creator
        if (participant._id.toString() === program.creator.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot remove the program creator'
            });
        }

        // Remove participant from program
        program.participants = program.participants.filter(p => 
            p.toString() !== participant._id.toString()
        );
        await program.save();

        // Populate the response
        const updatedProgram = await Program.findById(id)
            .populate('organization', 'name')
            .populate('creator', 'username')
            .populate('participants', 'username');

        res.status(200).json({
            success: true,
            message: 'Participant removed successfully',
            program: updatedProgram
        });

    } catch (error) {
        console.error('Error removing participant:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Delete program
exports.deleteProgram = async (req, res) => {
    try {
        const { id } = req.params;
        const { deleterUsername } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid program ID'
            });
        }

        // Find the program
        const program = await Program.findById(id).populate('organization');
        if (!program) {
            return res.status(404).json({
                success: false,
                message: 'Program not found'
            });
        }

        // Find the deleter user
        const deleter = await User.findOne({ username: deleterUsername });
        if (!deleter) {
            return res.status(404).json({
                success: false,
                message: 'Deleter user not found'
            });
        }

        // Check if user has permission to delete (must be admin in the organization)
        const isAdmin = await Membership.isAdmin(deleter._id, program.organization._id);
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can delete programs in this organization'
            });
        }

        // Remove program from organization's programs list
        await Organization.findByIdAndUpdate(
            program.organization._id,
            { $pull: { programs: program._id } }
        );

        // Delete the program
        await Program.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Program deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting program:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Upload datasheets (multiple files) -> store in GridFS
exports.uploadDatasheets = [
    uploadDatasheet.array('datasheets', 10),
    async (req, res) => {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, message: 'Invalid program ID' });
            }
            const program = await Program.findById(id);
            if (!program) return res.status(404).json({ success: false, message: 'Program not found' });

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ success: false, message: 'No files uploaded' });
            }

            const additions = [];
            for (const f of req.files) {
                // upload buffer to GridFS
                const fileDoc = await uploadBufferToGridFS(f.buffer, f.originalname, { originalname: f.originalname, contentType: f.mimetype, programId: id, fieldname: f.fieldname, kind: 'datasheet' });
                const add = { filename: fileDoc.filename, originalname: f.originalname, url: `/files/${fileDoc._id}`, uploadedAt: new Date(), gridFsId: fileDoc._id.toString() };
                additions.push(add);
            }

            program.datasheets = program.datasheets.concat(additions);
            await program.save();

            res.status(200).json({ success: true, message: 'Datasheets uploaded', files: additions });
        } catch (err) {
            console.error('Error uploading datasheets:', err);
            res.status(500).json({ success: false, message: 'Server error', error: err.message });
        }
    }
];

// Upload images (multiple files) -> store in GridFS
exports.uploadImages = [
    uploadImage.array('images', 20),
    async (req, res) => {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, message: 'Invalid program ID' });
            }
            const program = await Program.findById(id);
            if (!program) return res.status(404).json({ success: false, message: 'Program not found' });

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ success: false, message: 'No images uploaded' });
            }

            const additions = [];
            for (const f of req.files) {
                const fileDoc = await uploadBufferToGridFS(f.buffer, f.originalname, { originalname: f.originalname, contentType: f.mimetype, programId: id, fieldname: f.fieldname, kind: 'image' });
                const add = { filename: fileDoc.filename, originalname: f.originalname, url: `/files/${fileDoc._id}`, uploadedAt: new Date(), gridFsId: fileDoc._id.toString() };
                additions.push(add);
            }

            program.images = program.images.concat(additions);
            await program.save();

            res.status(200).json({ success: true, message: 'Images uploaded', files: additions });
        } catch (err) {
            console.error('Error uploading images:', err);
            res.status(500).json({ success: false, message: 'Server error', error: err.message });
        }
    }
];