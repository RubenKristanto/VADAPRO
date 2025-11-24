import Membership from '../models/membershipModel.js';
import Organization from '../models/organizationModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';

// Invite user to organization
export const inviteUser = async (req, res) => {
    try {
        const { organizationId, username, inviterUsername } = req.body;

        // Validate required fields
        if (!organizationId || !username || !inviterUsername) {
            return res.status(400).json({
                success: false,
                message: 'Organization ID, username, and inviter username are required'
            });
        }

        // Validate organization ID
        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization ID'
            });
        }

        // Find organization
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Find inviter
        const inviter = await User.findOne({ username: inviterUsername });
        if (!inviter) {
            return res.status(404).json({
                success: false,
                message: 'Inviter not found'
            });
        }

        // Check if inviter is admin
        const isInviterAdmin = await Membership.isAdmin(inviter._id, organizationId);
        if (!isInviterAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can invite users to the organization'
            });
        }

        // Find user to invite
        const userToInvite = await User.findOne({ username });
        if (!userToInvite) {
            return res.status(404).json({
                success: false,
                message: 'User to invite not found'
            });
        }

        // Check if user is already a member
        const existingMembership = await Membership.findOne({
            user: userToInvite._id,
            organization: organizationId
        });

        if (existingMembership) {
            return res.status(409).json({
                success: false,
                message: 'User is already a member of this organization'
            });
        }

        // Create membership
        const membership = new Membership({
            user: userToInvite._id,
            organization: organizationId,
            role: 'member',
            invitedBy: inviter._id
        });

        await membership.save();

        // Add organization to user's organizations list
        await User.findByIdAndUpdate(
            userToInvite._id,
            { $addToSet: { organizations: organizationId } }
        );

        // Populate the response
        const populatedMembership = await Membership.findById(membership._id)
            .populate('user', 'username')
            .populate('organization', 'name')
            .populate('invitedBy', 'username');

        res.status(201).json({
            success: true,
            message: 'User invited successfully',
            membership: populatedMembership
        });

    } catch (error) {
        console.error('Error inviting user:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Remove user from organization
export const removeUser = async (req, res) => {
    try {
        const { organizationId, username, removerUsername } = req.body;

        // Validate required fields
        if (!organizationId || !username || !removerUsername) {
            return res.status(400).json({
                success: false,
                message: 'Organization ID, username, and remover username are required'
            });
        }

        // Validate organization ID
        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization ID'
            });
        }

        // Find organization
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Find remover
        const remover = await User.findOne({ username: removerUsername });
        if (!remover) {
            return res.status(404).json({
                success: false,
                message: 'Remover not found'
            });
        }

        // Check if remover is admin
        const isRemoverAdmin = await Membership.isAdmin(remover._id, organizationId);
        if (!isRemoverAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can remove users from the organization'
            });
        }

        // Find user to remove
        const userToRemove = await User.findOne({ username });
        if (!userToRemove) {
            return res.status(404).json({
                success: false,
                message: 'User to remove not found'
            });
        }

        // Check if user is a member
        const membership = await Membership.findOne({
            user: userToRemove._id,
            organization: organizationId
        });

        if (!membership) {
            return res.status(404).json({
                success: false,
                message: 'User is not a member of this organization'
            });
        }

        // Prevent removing the organization creator unless there are other admins
        if (organization.creator.toString() === userToRemove._id.toString()) {
            const adminCount = await Membership.countAdmins(organizationId);
            if (adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot remove the organization creator when they are the only admin'
                });
            }
        }

        // Remove membership
        await Membership.findByIdAndDelete(membership._id);

        // Remove organization from user's organizations list
        await User.findByIdAndUpdate(
            userToRemove._id,
            { $pull: { organizations: organizationId } }
        );

        res.status(200).json({
            success: true,
            message: 'User removed from organization successfully'
        });

    } catch (error) {
        console.error('Error removing user:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Change user role
export const changeUserRole = async (req, res) => {
    try {
        const { organizationId, username, newRole, changerUsername } = req.body;

        // Validate required fields
        if (!organizationId || !username || !newRole || !changerUsername) {
            return res.status(400).json({
                success: false,
                message: 'Organization ID, username, new role, and changer username are required'
            });
        }

        // Validate role
        if (!['admin', 'member'].includes(newRole)) {
            return res.status(400).json({
                success: false,
                message: 'Role must be either "admin" or "member"'
            });
        }

        // Validate organization ID
        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization ID'
            });
        }

        // Find organization
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Find changer
        const changer = await User.findOne({ username: changerUsername });
        if (!changer) {
            return res.status(404).json({
                success: false,
                message: 'Changer not found'
            });
        }

        // Find user whose role is being changed
        const targetUser = await User.findOne({ username });
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'Target user not found'
            });
        }

        // Find memberships
        const changerMembership = await Membership.findOne({
            user: changer._id,
            organization: organizationId
        });

        const targetMembership = await Membership.findOne({
            user: targetUser._id,
            organization: organizationId
        });

        if (!changerMembership || !targetMembership) {
            return res.status(404).json({
                success: false,
                message: 'One or both users are not members of this organization'
            });
        }

        // Check permissions
        const isChangerAdmin = changerMembership.role === 'admin';
        const isSelfDemotion = changer._id.toString() === targetUser._id.toString() && newRole === 'member';

        if (!isChangerAdmin && !isSelfDemotion) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can change user roles, or users can demote themselves'
            });
        }

        // If it's self-demotion from admin, check if there are other admins
        if (isSelfDemotion && targetMembership.role === 'admin') {
            const adminCount = await Membership.countAdmins(organizationId);
            if (adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot demote yourself when you are the only admin'
                });
            }
        }

        // Update role
        targetMembership.role = newRole;
        await targetMembership.save();

        // Populate the response
        const populatedMembership = await Membership.findById(targetMembership._id)
            .populate('user', 'username')
            .populate('organization', 'name')
            .populate('invitedBy', 'username');

        res.status(200).json({
            success: true,
            message: `User role changed to ${newRole} successfully`,
            membership: populatedMembership
        });

    } catch (error) {
        console.error('Error changing user role:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get organization members with roles
export const getOrganizationMembers = async (req, res) => {
    try {
        const { organizationId } = req.params;

        // Validate organization ID
        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Find organization
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Get all memberships for this organization
        const memberships = await Membership.find({ organization: organizationId })
            .populate('user', 'username')
            .populate('invitedBy', 'username')
            .sort({ joinedAt: 1 });

        res.status(200).json({
            success: true,
            memberships,
            count: memberships.length
        });

    } catch (error) {
        console.error('Error fetching organization members:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get user's role in organization
export const getUserRole = async (req, res) => {
    try {
        const { organizationId, username } = req.params;

        // Validate organization ID
        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization ID'
            });
        }

        // Find user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user's role
        const role = await Membership.getUserRole(user._id, organizationId);

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'User is not a member of this organization'
            });
        }

        res.status(200).json({
            success: true,
            role
        });

    } catch (error) {
        console.error('Error fetching user role:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};