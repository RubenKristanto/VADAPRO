import mongoose from 'mongoose';

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
programSchema.index({ status: 1 });

export default mongoose.model('Program', programSchema, 'programs');