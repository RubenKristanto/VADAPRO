import mongoose from 'mongoose';

// Sub-schema for chat messages
const chatMessageSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['user', 'ai'],
        required: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 5000
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    isError: {
        type: Boolean,
        default: false
    }
}, { _id: true });

// Sub-schema for selected statistical parameters
const selectedStatSchema = new mongoose.Schema({
    statId: {
        type: String,
        required: true,
        trim: true
    },
    label: {
        type: String,
        required: true,
        trim: true
    },
    icon: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        enum: ['central-tendency', 'dispersion', 'bounds', 'quantiles', 'shape', 'cumulative', 'other'],
        required: true
    },
    categoryLabel: {
        type: String,
        trim: true
    },
    calculatedValues: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: new Map()
    },
    calculatedAt: {
        type: Date
    }
}, { _id: true });

// Sub-schema for process logs
const processLogSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true,
        maxlength: 500
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    level: {
        type: String,
        enum: ['info', 'warning', 'error', 'success'],
        default: 'info'
    }
}, { _id: true });

// Main Process schema
const processSchema = new mongoose.Schema({
    // Entry/Data Information
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    sourceFileName: {
        type: String,
        trim: true,
        maxlength: 500
    },
    responseCount: {
        type: Number,
        default: 0,
        min: 0
    },
    rawData: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    processedData: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    
    // CSV file URL
    csvUrl: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    
    chartConfigs: [{
        id: { type: Number, required: true },
        question: { type: String, required: true },
        chartType: { type: String, required: true },
        data: { type: mongoose.Schema.Types.Mixed, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    
    compareChartConfigs: [{
        id: Number,
        question: String,
        entries: [{
            year: Number,
            entryId: String,
            entryName: String,
            meanValue: Number
        }],
        timestamp: { type: Date, default: Date.now }
    }],
    
    // Process status and progress
    processStatus: {
        type: String,
        enum: ['ready', 'processing', 'completed', 'failed'],
        default: 'ready'
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    
    // Process logs
    logs: [processLogSchema],
    
    // Statistical parameters
    selectedStats: [selectedStatSchema],
    
    // AI Chat interface
    chatMessages: [chatMessageSchema],
    
    // Relationships
    entry: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    
    // Year/Period information
    year: {
        type: Number,
        required: false,  // Made optional - can be null if no program/year context
        min: 1900,
        max: 2100,
        default: null
    },
    
    // Metadata
    tags: [{
        type: String,
        trim: true,
        maxlength: 50
    }],
    
    // Danfo.js configuration
    danfoConfig: {
        columns: [{
            name: String,
            type: String,
            nullable: Boolean
        }],
        encoding: {
            type: String,
            default: 'utf-8'
        },
        delimiter: {
            type: String,
            default: ','
        }
    },
    
    // Processing configuration
    processingConfig: {
        autoCalculateStats: {
            type: Boolean,
            default: true
        },
        enableAI: {
            type: Boolean,
            default: true
        },
        geminiModel: {
            type: String,
            default: 'gemini-2.5-flash'
        },
        maxChatHistory: {
            type: Number,
            default: 50
        }
    },
    
    // Status tracking
    startedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    failedAt: {
        type: Date
    },
    
    // Error tracking
    errorMessage: {
        type: String,
        maxlength: 1000
    },
    errorStack: {
        type: String,
        maxlength: 5000
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for better query performance
processSchema.index({ entry: 1 });
processSchema.index({ processStatus: 1 });
processSchema.index({ createdAt: -1 });
processSchema.index({ name: 'text', tags: 'text' });

export default mongoose.model('Process', processSchema, 'processes');
