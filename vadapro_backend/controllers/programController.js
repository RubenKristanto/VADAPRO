const Program = require('../models/programModel');
const Organization = require('../models/organizationModel');
const User = require('../models/userModel');
const Membership = require('../models/membershipModel');
const WorkYear = require('../models/workYearModel');
const Process = require('../models/processModel');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

// Create a new program
exports.createProgram = async (req, res) => {
    try {
        const { name, description, organizationId, startDate, endDate } = req.body;

        // Validate required fields
        if (!name || !organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Program name and organization ID are required'
            });
        }

        // Validate organization ID
        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization ID'
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

        // Create the program
        const program = new Program({
            name: name.trim(),
            description: description ? description.trim() : undefined,
            organization: organizationId,
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
            .populate('organization', 'name');

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
            .populate('organization', 'name');

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
            .populate('organization', 'name');

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

        // Cascade delete: Find all work years for this program
        const workYears = await WorkYear.find({ program: id });

        // Delete each work year and its associated data
        for (const workYear of workYears) {
            // Delete all processes for this work year
            await Process.deleteMany({ workYear: workYear._id });
            
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
            await WorkYear.findByIdAndDelete(workYear._id);
        }

        // Delete all processes for this program
        await Process.deleteMany({ program: id });

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