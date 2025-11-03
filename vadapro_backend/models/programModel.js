const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        minlength: 3,
        maxlength: 100,
        trim: true
    },
    description: { 
        type: String, 
        maxlength: 500,
        trim: true
    },
    organization: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Organization', 
        required: true 
    },
    creator: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    participants: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    startDate: { 
        type: Date,
        default: Date.now
    },
    endDate: { 
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled', 'pending'],
        default: 'active'
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Index for better query performance
programSchema.index({ organization: 1 });
programSchema.index({ creator: 1 });
programSchema.index({ participants: 1 });
programSchema.index({ status: 1 });

// Virtual for participant count
programSchema.virtual('participantCount').get(function() {
    return this.participants ? this.participants.length : 0;
});

// Ensure virtuals are included when converting to JSON
programSchema.set('toJSON', { virtuals: true });
programSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Program', programSchema, 'programs');