import axiosAPI from '../utils/axiosConfig';

// Process service for API calls
class ProcessService {
  
  // Create a new process
  async createProcess(processData) {
    try {
      const response = await axiosAPI.post('/process/create', processData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get all processes
  async getAllProcesses() {
    try {
      const response = await axiosAPI.get('/process/all');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get process by ID
  async getProcessById(id) {
    try {
      const response = await axiosAPI.get(`/process/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get processes by status
  async getProcessesByStatus(status) {
    try {
      const response = await axiosAPI.get(`/process/status/${status}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Update process
  async updateProcess(id, updateData) {
    try {
      const response = await axiosAPI.put(`/process/${id}`, updateData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Delete process
  async deleteProcess(id) {
    try {
      const response = await axiosAPI.delete(`/process/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Add log entry
  async addLog(id, message, level = 'info') {
    try {
      const response = await axiosAPI.post(`/process/${id}/logs`, {
        message,
        level
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get logs
  async getLogs(id) {
    try {
      const response = await axiosAPI.get(`/process/${id}/logs`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Add chat message
  async addChatMessage(id, type, content, isError = false) {
    try {
      const response = await axiosAPI.post(`/process/${id}/chat`, {
        type,
        content,
        isError
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get chat messages
  async getChatMessages(id) {
    try {
      const response = await axiosAPI.get(`/process/${id}/chat`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Clear chat history
  async clearChatHistory(id) {
    try {
      const response = await axiosAPI.delete(`/process/${id}/chat`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Add selected statistic
  async addSelectedStat(id, statData) {
    try {
      const response = await axiosAPI.post(`/process/${id}/stats`, statData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get selected statistics
  async getSelectedStats(id) {
    try {
      const response = await axiosAPI.get(`/process/${id}/stats`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Remove selected statistic
  async removeSelectedStat(id, statId) {
    try {
      const response = await axiosAPI.delete(`/process/${id}/stats/${statId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Update statistic value
  async updateStatValue(id, statId, value) {
    try {
      const response = await axiosAPI.put(`/process/${id}/stats/${statId}`, { value });
      return response.data;
    } catch (error) {
      console.error(`Error updating stat ${statId}:`, error.message);
      return this.handleError(error);
    }
  }

  // Update progress
  async updateProgress(id, progress, logMessage = null) {
    try {
      const response = await axiosAPI.put(`/process/${id}/progress`, {
        progress,
        logMessage
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Update process status
  async updateProcessStatus(id, status) {
    try {
      const response = await axiosAPI.put(`/process/${id}/status`, {
        status
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get CSV data URL - backend should return { success: true, csvUrl: 'url/to/csv' }
  async getCsvData(id) {
    try {
      const response = await axiosAPI.get(`/process/${id}/csvdata`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateChartConfigs(id, chartConfigs) {
    try {
      const response = await axiosAPI.put(`/process/${id}`, { chartConfigs });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateCompareChartConfigs(id, compareChartConfigs) {
    try {
      const response = await axiosAPI.put(`/process/${id}`, { compareChartConfigs });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      // Server responded with an error status
      return {
        success: false,
        message: error.response.data.message || 'An error occurred',
        error: error.response.data
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        success: false,
        message: 'No response from server. Please check your connection.',
        error: error.request
      };
    } else {
      // Something else happened
      return {
        success: false,
        message: error.message || 'An unexpected error occurred',
        error: error
      };
    }
  }
}

// Export a singleton instance
export default new ProcessService();
