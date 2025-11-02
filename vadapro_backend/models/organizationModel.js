const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        unique: true, 
        minlength: 3,
        maxlength: 100,
        trim: true
    },
    creator: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    description: {
        type: String,
        maxlength: 500,
        trim: true
    },
    programs: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Program' 
    }],
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Index for better query performance
organizationSchema.index({ creator: 1 });
organizationSchema.index({ name: 1 });

// Virtual for member count - now calculated from Membership model
organizationSchema.virtual('memberCount', {
    ref: 'Membership',
    localField: '_id',
    foreignField: 'organization',
    count: true
});

// Virtual for admin count - calculated from Membership model
organizationSchema.virtual('adminCount', {
    ref: 'Membership',
    localField: '_id',
    foreignField: 'organization',
    match: { role: 'admin' },
    count: true
});

// Virtual for members with roles
organizationSchema.virtual('memberships', {
    ref: 'Membership',
    localField: '_id',
    foreignField: 'organization'
});

// Virtual for program count
organizationSchema.virtual('programCount').get(function() {
    return this.programs ? this.programs.length : 0;
});

// Ensure virtuals are included when converting to JSON
organizationSchema.set('toJSON', { virtuals: true });
organizationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Organization', organizationSchema, 'organizations');