const Process = require('../models/processModel');
const Program = require('../models/programModel');
const Organization = require('../models/organizationModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');

// Create a new process
exports.createProcess = async (req, res) => {
    try {
        const {
            name,
            sourceFile,
            responseCount,
            rawData,
            programId,
            organizationId,
            creatorUsername,
            year,
            tags,
            danfoConfig,
            processingConfig
        } = req.body;

        // Validate required fields (program and year are optional for now)
        if (!name || !organizationId || !creatorUsername) {
            return res.status(400).json({
                success: false,
                message: 'Name, organization ID, and creator username are required'
            });
        }

        // Validate organization ID
        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization ID'
            });
        }

        // Validate program ID if provided
        if (programId && !mongoose.Types.ObjectId.isValid(programId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid program ID'
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

        // Verify program exists (only if programId is provided)
        if (programId) {
            const program = await Program.findById(programId);
            if (!program) {
                return res.status(404).json({
                    success: false,
                    message: 'Program not found'
                });
            }
        }

        // Verify organization exists
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Create the process
        const process = new Process({
            name: name.trim(),
            sourceFile: sourceFile ? sourceFile.trim() : undefined,
            responseCount: responseCount || 0,
            rawData: rawData || null,
            program: programId || null,  // Allow null if not provided
            organization: organizationId,
            creator: creator._id,
            year: year || null,  // Allow null if not provided
            tags: tags || [],
            danfoConfig: danfoConfig || undefined,
            processingConfig: processingConfig || undefined
        });

        await process.save();

        // Populate the response
        const populatedProcess = await Process.findById(process._id)
            .populate('program', 'name')
            .populate('organization', 'name')
            .populate('creator', 'username');

        res.status(201).json({
            success: true,
            message: 'Process created successfully',
            process: populatedProcess
        });

    } catch (error) {
        console.error('Error creating process:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get all processes
exports.getAllProcesses = async (req, res) => {
    try {
        const processes = await Process.find()
            .populate('program', 'name')
            .populate('organization', 'name')
            .populate('creator', 'username')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: processes.length,
            processes
        });

    } catch (error) {
        console.error('Error fetching processes:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get process by ID
exports.getProcessById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid process ID'
            });
        }

        const process = await Process.findById(id)
            .populate('program', 'name description')
            .populate('organization', 'name')
            .populate('creator', 'username');

        if (!process) {
            return res.status(404).json({
                success: false,
                message: 'Process not found'
            });
        }

        res.status(200).json({
            success: true,
            process
        });

    } catch (error) {
        console.error('Error fetching process:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get processes by program ID
exports.getProcessesByProgram = async (req, res) => {
    try {
        const { programId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(programId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid program ID'
            });
        }

        const processes = await Process.find({ program: programId })
            .populate('organization', 'name')
            .populate('creator', 'username')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: processes.length,
            processes
        });

    } catch (error) {
        console.error('Error fetching processes by program:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get processes by program and year
exports.getProcessesByProgramAndYear = async (req, res) => {
    try {
        const { programId, year } = req.params;

        if (!mongoose.Types.ObjectId.isValid(programId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid program ID'
            });
        }

        const processes = await Process.find({ 
            program: programId,
            year: parseInt(year)
        })
            .populate('organization', 'name')
            .populate('creator', 'username')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: processes.length,
            processes
        });

    } catch (error) {
        console.error('Error fetching processes by program and year:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get processes by organization ID
exports.getProcessesByOrganization = async (req, res) => {
    try {
        const { organizationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization ID'
            });
        }

        const processes = await Process.find({ organization: organizationId })
            .populate('program', 'name')
            .populate('creator', 'username')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: processes.length,
            processes
        });

    } catch (error) {
        console.error('Error fetching processes by organization:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get processes by status
exports.getProcessesByStatus = async (req, res) => {
    try {
        const { status } = req.params;

        const validStatuses = ['ready', 'processing', 'completed', 'failed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: ready, processing, completed, failed'
            });
        }

        const processes = await Process.find({ processStatus: status })
            .populate('program', 'name')
            .populate('organization', 'name')
            .populate('creator', 'username')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: processes.length,
            processes
        });

    } catch (error) {
        console.error('Error fetching processes by status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Update process
exports.updateProcess = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid process ID'
            });
        }

        const process = await Process.findById(id);
        if (!process) {
            return res.status(404).json({
                success: false,
                message: 'Process not found'
            });
        }

        // Update allowed fields
        const allowedUpdates = [
            'name', 'sourceFile', 'responseCount', 'rawData', 'processedData',
            'imageUrl', 'imageStoragePath', 'processStatus', 'progress',
            'year', 'tags', 'danfoConfig', 'processingConfig',
            'errorMessage', 'errorStack'
        ];

        allowedUpdates.forEach(field => {
            if (updateData[field] !== undefined) {
                process[field] = updateData[field];
            }
        });

        // Update timestamp
        process.updatedAt = Date.now();

        await process.save();

        const updatedProcess = await Process.findById(id)
            .populate('program', 'name')
            .populate('organization', 'name')
            .populate('creator', 'username');

        res.status(200).json({
            success: true,
            message: 'Process updated successfully',
            process: updatedProcess
        });

    } catch (error) {
        console.error('Error updating process:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Delete process
exports.deleteProcess = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid process ID'
            });
        }

        const process = await Process.findByIdAndDelete(id);

        if (!process) {
            return res.status(404).json({
                success: false,
                message: 'Process not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Process deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting process:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Add a log entry
exports.addLog = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, level } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid process ID'
            });
        }

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Log message is required'
            });
        }

        const process = await Process.findById(id);
        if (!process) {
            return res.status(404).json({
                success: false,
                message: 'Process not found'
            });
        }

        const log = {
            message: message.trim(),
            level: level || 'info',
            timestamp: new Date()
        };

        process.logs.push(log);
        await process.save();

        res.status(200).json({
            success: true,
            message: 'Log added successfully',
            log
        });

    } catch (error) {
        console.error('Error adding log:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get all logs for a process
exports.getLogs = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid process ID'
            });
        }

        const process = await Process.findById(id).select('logs');
        if (!process) {
            return res.status(404).json({
                success: false,
                message: 'Process not found'
            });
        }

        res.status(200).json({
            success: true,
            count: process.logs.length,
            logs: process.logs
        });

    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Add a chat message
exports.addChatMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, content, isError } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid process ID'
            });
        }

        if (!type || !content) {
            return res.status(400).json({
                success: false,
                message: 'Message type and content are required'
            });
        }

        if (!['user', 'ai'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Message type must be either "user" or "ai"'
            });
        }

        const process = await Process.findById(id);
        if (!process) {
            return res.status(404).json({
                success: false,
                message: 'Process not found'
            });
        }

        const message = {
            type,
            content: content.trim(),
            timestamp: new Date(),
            isError: isError || false
        };

        process.chatMessages.push(message);

        // Limit chat history if configured
        if (process.processingConfig.maxChatHistory && 
            process.chatMessages.length > process.processingConfig.maxChatHistory) {
            process.chatMessages = process.chatMessages.slice(-process.processingConfig.maxChatHistory);
        }

        await process.save();

        res.status(200).json({
            success: true,
            message: 'Chat message added successfully',
            chatMessage: message
        });

    } catch (error) {
        console.error('Error adding chat message:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get chat messages for a process
exports.getChatMessages = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid process ID'
            });
        }

        const process = await Process.findById(id).select('chatMessages');
        if (!process) {
            return res.status(404).json({
                success: false,
                message: 'Process not found'
            });
        }

        res.status(200).json({
            success: true,
            count: process.chatMessages.length,
            chatMessages: process.chatMessages
        });

    } catch (error) {
        console.error('Error fetching chat messages:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Clear chat history
exports.clearChatHistory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid process ID'
            });
        }

        const process = await Process.findById(id);
        if (!process) {
            return res.status(404).json({
                success: false,
                message: 'Process not found'
            });
        }

        process.chatMessages = [{
            type: 'ai',
            content: 'Chat history cleared. How can I help you?',
            timestamp: new Date(),
            isError: false
        }];

        await process.save();

        res.status(200).json({
            success: true,
            message: 'Chat history cleared successfully'
        });

    } catch (error) {
        console.error('Error clearing chat history:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Add a selected statistic
exports.addSelectedStat = async (req, res) => {
    try {
        const { id } = req.params;
        const { statId, label, icon, category, categoryLabel } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid process ID'
            });
        }

        if (!statId || !label || !category) {
            return res.status(400).json({
                success: false,
                message: 'Stat ID, label, and category are required'
            });
        }

        const process = await Process.findById(id);
        if (!process) {
            return res.status(404).json({
                success: false,
                message: 'Process not found'
            });
        }

        // Check if stat already exists
        const existingIndex = process.selectedStats.findIndex(s => s.statId === statId);

        if (existingIndex >= 0) {
            // Update existing
            process.selectedStats[existingIndex] = {
                statId,
                label,
                icon: icon || '',
                category,
                categoryLabel: categoryLabel || '',
                calculatedValue: process.selectedStats[existingIndex].calculatedValue,
                calculatedAt: process.selectedStats[existingIndex].calculatedAt
            };
        } else {
            // Add new
            process.selectedStats.push({
                statId,
                label,
                icon: icon || '',
                category,
                categoryLabel: categoryLabel || ''
            });
        }

        await process.save();

        res.status(200).json({
            success: true,
            message: 'Selected statistic added successfully',
            selectedStats: process.selectedStats
        });

    } catch (error) {
        console.error('Error adding selected statistic:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Remove a selected statistic
exports.removeSelectedStat = async (req, res) => {
    try {
        const { id, statId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid process ID'
            });
        }

        const process = await Process.findById(id);
        if (!process) {
            return res.status(404).json({
                success: false,
                message: 'Process not found'
            });
        }

        process.selectedStats = process.selectedStats.filter(s => s.statId !== statId);

        // Also remove from statisticsData map
        if (process.statisticsData.has(statId)) {
            process.statisticsData.delete(statId);
        }

        await process.save();

        res.status(200).json({
            success: true,
            message: 'Selected statistic removed successfully',
            selectedStats: process.selectedStats
        });

    } catch (error) {
        console.error('Error removing selected statistic:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Update statistic value
exports.updateStatValue = async (req, res) => {
    try {
        const { id, statId } = req.params;
        const { value } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid process ID'
            });
        }

        if (value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Statistic value is required'
            });
        }

        const process = await Process.findById(id);
        if (!process) {
            return res.status(404).json({
                success: false,
                message: 'Process not found'
            });
        }

        const stat = process.selectedStats.find(s => s.statId === statId);
        if (!stat) {
            return res.status(404).json({
                success: false,
                message: 'Selected statistic not found'
            });
        }

        stat.calculatedValue = value;
        stat.calculatedAt = new Date();

        // Also update in statisticsData map
        process.statisticsData.set(statId, value);

        await process.save();

        res.status(200).json({
            success: true,
            message: 'Statistic value updated successfully',
            stat
        });

    } catch (error) {
        console.error('Error updating statistic value:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get selected statistics
exports.getSelectedStats = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid process ID'
            });
        }

        const process = await Process.findById(id).select('selectedStats statisticsData');
        if (!process) {
            return res.status(404).json({
                success: false,
                message: 'Process not found'
            });
        }

        res.status(200).json({
            success: true,
            count: process.selectedStats.length,
            selectedStats: process.selectedStats,
            statisticsData: Object.fromEntries(process.statisticsData)
        });

    } catch (error) {
        console.error('Error fetching selected statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Update progress
exports.updateProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const { progress, logMessage } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid process ID'
            });
        }

        if (progress === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Progress value is required'
            });
        }

        const process = await Process.findById(id);
        if (!process) {
            return res.status(404).json({
                success: false,
                message: 'Process not found'
            });
        }

        process.progress = Math.max(0, Math.min(100, progress));

        if (logMessage) {
            process.logs.push({
                message: logMessage,
                level: 'info',
                timestamp: new Date()
            });
        }

        // Auto-complete if progress reaches 100
        if (process.progress >= 100 && process.processStatus === 'processing') {
            process.processStatus = 'completed';
            process.completedAt = new Date();
        }

        await process.save();

        res.status(200).json({
            success: true,
            message: 'Progress updated successfully',
            progress: process.progress,
            processStatus: process.processStatus
        });

    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Update process status
exports.updateProcessStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid process ID'
            });
        }

        const validStatuses = ['ready', 'processing', 'completed', 'failed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: ready, processing, completed, failed'
            });
        }

        const process = await Process.findById(id);
        if (!process) {
            return res.status(404).json({
                success: false,
                message: 'Process not found'
            });
        }

        const oldStatus = process.processStatus;
        process.processStatus = status;

        // Set timestamps based on status changes
        if (status === 'processing' && !process.startedAt) {
            process.startedAt = new Date();
        } else if (status === 'completed' && !process.completedAt) {
            process.completedAt = new Date();
            process.progress = 100;
        } else if (status === 'failed' && !process.failedAt) {
            process.failedAt = new Date();
        }

        await process.save();

        res.status(200).json({
            success: true,
            message: `Process status updated from ${oldStatus} to ${status}`,
            processStatus: process.processStatus,
            startedAt: process.startedAt,
            completedAt: process.completedAt,
            failedAt: process.failedAt
        });

    } catch (error) {
        console.error('Error updating process status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};
