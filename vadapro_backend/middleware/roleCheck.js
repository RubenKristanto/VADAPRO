import Membership from '../models/membershipModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';

// Middleware to check if user is admin in organization
const checkAdminRole = async (req, res, next) => {
    try {
        const { organizationId, username } = req.body;

        if (!organizationId || !username) {
            return res.status(400).json({
                success: false,
                message: 'Organization ID and username are required'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization ID'
            });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const isAdmin = await Membership.isAdmin(user._id, organizationId);
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Admin role required for this action'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Error checking admin role:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Middleware to check if user is member (admin or member) in organization
const checkMemberRole = async (req, res, next) => {
    try {
        const { organizationId, username } = req.body;

        if (!organizationId || !username) {
            return res.status(400).json({
                success: false,
                message: 'Organization ID and username are required'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization ID'
            });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const isMember = await Membership.isMember(user._id, organizationId);
        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: 'Organization membership required for this action'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Error checking member role:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Middleware to get user role in organization (without enforcing)
const getUserRole = async (req, res, next) => {
    try {
        const { organizationId, username } = req.body;

        if (!organizationId || !username) {
            req.userRole = null;
            return next();
        }

        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            req.userRole = null;
            return next();
        }

        const user = await User.findOne({ username });
        if (!user) {
            req.userRole = null;
            return next();
        }

        const role = await Membership.getUserRole(user._id, organizationId);
        req.user = user;
        req.userRole = role;
        next();
    } catch (error) {
        console.error('Error getting user role:', error);
        req.userRole = null;
        next();
    }
};

export {
    checkAdminRole,
    checkMemberRole,
    getUserRole
};