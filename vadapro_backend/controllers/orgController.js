import Organization from '../models/organizationModel.js';
import User from '../models/userModel.js';
import Membership from '../models/membershipModel.js';
import Program from '../models/programModel.js';
import WorkYear from '../models/workYearModel.js';
import Process from '../models/processModel.js';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

// Create a new organization
export const createOrganization = async (req, res) => {
    try {
        const { name, creatorUsername, description } = req.body;

        // Validate required fields
        if (!name || !creatorUsername) {
            return res.status(400).json({
                success: false,
                message: 'Organization name and creator username are required'
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

        // Check if organization name already exists
        const existingOrg = await Organization.findOne({ name: name.trim() });
        if (existingOrg) {
            return res.status(409).json({
                success: false,
                message: 'Organization name already exists'
            });
        }

        // Create the organization
        const organization = new Organization({
            name: name.trim(),
            creator: creator._id,
            description: description ? description.trim() : undefined
        });

        await organization.save();

        // Create membership for creator as admin
        const creatorMembership = new Membership({
            user: creator._id,
            organization: organization._id,
            role: 'admin'
        });

        await creatorMembership.save();

        // Add organization to creator's organizations list
        await User.findByIdAndUpdate(
            creator._id,
            { $addToSet: { organizations: organization._id } }
        );

        // Populate the response
        const populatedOrg = await Organization.findById(organization._id)
            .populate('creator', 'username')
            .populate('programs')
            .populate({
                path: 'memberships',
                populate: {
                    path: 'user',
                    select: 'username'
                }
            });

        res.status(201).json({
            success: true,
            message: 'Organization created successfully',
            organization: populatedOrg
        });

    } catch (error) {
        console.error('Error creating organization:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get all organizations
export const getAllOrganizations = async (req, res) => {
    try {
        const organizations = await Organization.find()
            .populate('creator', 'username')
            .populate('programs')
            .populate({
                path: 'memberships',
                populate: {
                    path: 'user',
                    select: 'username'
                }
            })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            organizations
        });

    } catch (error) {
        console.error('Error fetching organizations:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get organizations by user
export const getUserOrganizations = async (req, res) => {
    try {
        const { username } = req.params;

        // Find the user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find organizations where user is a member through membership
        const memberships = await Membership.find({ user: user._id })
            .populate({
                path: 'organization',
                populate: [
                    { path: 'creator', select: 'username' },
                    { path: 'programs' },
                    { path: 'memberCount'},
                    {
                        path: 'memberships',
                        populate: {
                            path: 'user',
                            select: 'username'
                        }
                    }
                ]
            })
            .sort({ joinedAt: -1 });

        const organizations = memberships.map(membership => ({
            ...membership.organization.toObject(),
            userRole: membership.role
        }));

        res.status(200).json({
            success: true,
            organizations
        });

    } catch (error) {
        console.error('Error fetching user organizations:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get single organization by ID
export const getOrganizationById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization ID'
            });
        }

        const organization = await Organization.findById(id)
            .populate('creator', 'username')
            .populate('programs')
            .populate({
                path: 'memberships',
                populate: {
                    path: 'user',
                    select: 'username'
                }
            });

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        res.status(200).json({
            success: true,
            organization
        });

    } catch (error) {
        console.error('Error fetching organization:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Edit organization
export const editOrganization = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, editorUsername } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization ID'
            });
        }

        // Find the organization
        const organization = await Organization.findById(id);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
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

        // Check if user has permission to edit (must be admin)
        const isAdmin = await Membership.isAdmin(editor._id, id);
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can edit this organization'
            });
        }

        // Check if new name conflicts with existing organizations (excluding current one)
        if (name && name.trim() !== organization.name) {
            const existingOrg = await Organization.findOne({ 
                name: name.trim(),
                _id: { $ne: id }
            });
            if (existingOrg) {
                return res.status(409).json({
                    success: false,
                    message: 'Organization name already exists'
                });
            }
            organization.name = name.trim();
        }

        // Update description if provided
        if (description !== undefined) {
            organization.description = description ? description.trim() : undefined;
        }

        await organization.save();

        // Populate the response
        const updatedOrg = await Organization.findById(id)
            .populate('creator', 'username')
            .populate('programs')
            .populate({
                path: 'memberships',
                populate: {
                    path: 'user',
                    select: 'username'
                }
            });

        res.status(200).json({
            success: true,
            message: 'Organization updated successfully',
            organization: updatedOrg
        });

    } catch (error) {
        console.error('Error updating organization:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Delete organization
export const deleteOrganization = async (req, res) => {
    try {
        const { id } = req.params;
        const { deleterUsername } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization ID'
            });
        }

        // Find the organization
        const organization = await Organization.findById(id);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
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

        // Check if user has permission to delete (must be admin)
        const isAdmin = await Membership.isAdmin(deleter._id, id);
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can delete the organization'
            });
        }

        // Cascade delete: Find all programs in this organization
        const programs = await Program.find({ organization: id });

        // Delete each program and its associated data
        for (const program of programs) {
            // Find all work years for this program
            const workYears = await WorkYear.find({ program: program._id });
            
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
                                await bucket.delete(new mongoose.Types.ObjectId(entry.file.filename));
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
            await Process.deleteMany({ program: program._id });
            
            // Delete the program
            await Program.findByIdAndDelete(program._id);
        }

        // Delete all processes for this organization
        await Process.deleteMany({ organization: id });

        // Remove all memberships for this organization
        await Membership.deleteMany({ organization: id });

        // Remove organization from all users' organizations list
        await User.updateMany(
            { organizations: id },
            { $pull: { organizations: id } }
        );

        // Delete the organization
        await Organization.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Organization deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting organization:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};