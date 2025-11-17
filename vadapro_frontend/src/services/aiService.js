import axiosAPI from '../utils/axiosConfig';

// AI service for Gemini API integration
class AIService {
  
  // Analyze data with AI
  async analyzeData(query, context = {}) {
    try {
      const response = await axiosAPI.post('/ai/analyze', {
        query,
        statistics: context.statistics || {},
        chartConfig: context.chartConfig || null,
        csvSummary: context.csvSummary || null,
        csvData: context.csvData || null,
        context: {
          entryName: context.entryName,
          sourceFileName: context.sourceFileName,
          geminiFileUri: context.geminiFileUri,
          processId: context.processId,
          responseCount: context.responseCount,
          programName: context.programName,
          organizationName: context.organizationName,
          year: context.year
        },
        userId: context.userId
      });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Get current API usage statistics
  async getUsageStats() {
    try {
      const response = await axiosAPI.get('/ai/usage');
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Get model name
  async getModelName() {
    try {
      const response = await axiosAPI.get('/ai/model');
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Error handling
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const errorData = error.response.data;
      
      if (errorData.errorType === 'RATE_LIMIT') {
        return {
          success: false,
          message: errorData.message || 'Rate limit exceeded. Please wait before trying again.',
          errorType: 'RATE_LIMIT'
        };
      }
      
      if (errorData.errorType === 'QUOTA_EXCEEDED') {
        return {
          success: false,
          message: errorData.message || 'AI service quota exceeded. Please try again later.',
          errorType: 'QUOTA_EXCEEDED'
        };
      }
      
      if (errorData.errorType === 'CONFIG_ERROR') {
        return {
          success: false,
          message: errorData.message || 'AI service is not properly configured. Please contact support.',
          errorType: 'CONFIG_ERROR'
        };
      }
      
      return {
        success: false,
        message: errorData.message || 'Failed to analyze data. Please try again.',
        errorType: 'SERVER_ERROR'
      };
    } else if (error.request) {
      // Request made but no response received
      return {
        success: false,
        message: 'Cannot connect to AI service. Please check your connection.',
        errorType: 'NETWORK_ERROR'
      };
    } else {
      // Something else happened
      return {
        success: false,
        message: 'An unexpected error occurred.',
        errorType: 'UNKNOWN_ERROR'
      };
    }
  }
}

export default new AIService();
