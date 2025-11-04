import axiosAPI from '../utils/axiosConfig';

// Program service for API calls
class ProgramService {
  
  // Create a new program
  async createProgram(name, description, organizationId, startDate, endDate) {
    try {
      const response = await axiosAPI.post('/programs/create', {
        name,
        description,
        organizationId,
        startDate,
        endDate
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get programs for an organization
  async getOrganizationPrograms(organizationId) {
    try {
      const response = await axiosAPI.get(`/programs/organization/${organizationId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get a single program by ID
  async getProgramById(id) {
    try {
      const response = await axiosAPI.get(`/programs/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Edit program
  async editProgram(id, programData, editorUsername) {
    try {
      const response = await axiosAPI.put(`/programs/${id}`, {
        ...programData,
        editorUsername
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Delete program
  async deleteProgram(id, deleterUsername) {
    try {
      const response = await axiosAPI.delete(`/programs/${id}`, {
        data: { deleterUsername }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handler for consistent error messaging
  handleError(error) {
    if (error.response) {
      // Server responded with an error status
      return {
        success: false,
        message: error.response.data.message || 'An error occurred',
        status: error.response.status,
        data: error.response.data
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        success: false,
        message: 'Network error - please check your connection',
        status: 0
      };
    } else {
      // Something else happened
      return {
        success: false,
        message: error.message || 'An unexpected error occurred',
        status: 0
      };
    }
  }
}

// Export a singleton instance
export default new ProgramService();