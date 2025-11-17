import Process from '../models/processModel.js';
import Program from '../models/programModel.js';
import Organization from '../models/organizationModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';

// Create a new process
export const createProcess = async (req, res) => {
    try {
        const {
            name,
            sourceFileName,
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
            sourceFileName: sourceFileName ? sourceFileName.trim() : undefined,
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
export const getAllProcesses = async (req, res) => {
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
export const getProcessById = async (req, res) => {
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
export const updateProcess = async (req, res) => {
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
            'name', 'sourceFileName', 'responseCount', 'rawData', 'processedData',
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
export const deleteProcess = async (req, res) => {
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
export const addChatMessage = async (req, res) => {
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
export const clearChatHistory = async (req, res) => {
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
export const addSelectedStat = async (req, res) => {
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
export const removeSelectedStat = async (req, res) => {
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
export const updateStatValue = async (req, res) => {
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
export const updateProgress = async (req, res) => {
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
export const updateProcessStatus = async (req, res) => {
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
