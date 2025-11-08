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
            entryId,
            year,
            tags,
            danfoConfig,
            processingConfig
        } = req.body;

        // Validate required fields
        if (!name || !entryId) {
            return res.status(400).json({
                success: false,
                message: 'Name and entry ID are required'
            });
        }

        // Validate entry ID
        if (!mongoose.Types.ObjectId.isValid(entryId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid entry ID'
            });
        }

        // Create the process
        const process = new Process({
            name: name.trim(),
            sourceFile: sourceFile ? sourceFile.trim() : undefined,
            responseCount: responseCount || 0,
            rawData: rawData || null,
            entry: entryId,
            year: year || null,
            tags: tags || [],
            danfoConfig: danfoConfig || undefined,
            processingConfig: processingConfig || undefined
        });

        await process.save();

        res.status(201).json({
            success: true,
            message: 'Process created successfully',
            process: process
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

        const process = await Process.findById(id);

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

        res.status(200).json({
            success: true,
            message: 'Process updated successfully',
            process: process
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

        const baseStatId = statId.includes('|') ? statId.split('|')[1] : statId;
        const columnName = statId.includes('|') ? statId.split('|')[0] : 'default';
        const stat = process.selectedStats.find(s => s.statId === baseStatId);
        
        if (stat) {
            stat.calculatedValues.set(columnName, value);
            stat.calculatedAt = new Date();
        }

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
