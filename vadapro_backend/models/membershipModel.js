const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'member'],
        default: 'member',
        required: true
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

// Compound index to ensure a user can only have one membership per organization
membershipSchema.index({ user: 1, organization: 1 }, { unique: true });

// Index for performance
membershipSchema.index({ organization: 1, role: 1 });

// Static method to check if user is admin in organization
membershipSchema.statics.isAdmin = async function(userId, organizationId) {
    const membership = await this.findOne({
        user: userId,
        organization: organizationId,
        role: 'admin'
    });
    return !!membership;
};

// Static method to check if user is member (admin or member) in organization
membershipSchema.statics.isMember = async function(userId, organizationId) {
    const membership = await this.findOne({
        user: userId,
        organization: organizationId
    });
    return !!membership;
};

// Static method to get user role in organization
membershipSchema.statics.getUserRole = async function(userId, organizationId) {
    const membership = await this.findOne({
        user: userId,
        organization: organizationId
    });
    return membership ? membership.role : null;
};

// Static method to count admins in organization
membershipSchema.statics.countAdmins = async function(organizationId) {
    return await this.countDocuments({
        organization: organizationId,
        role: 'admin'
    });
};

module.exports = mongoose.model('Membership', membershipSchema);