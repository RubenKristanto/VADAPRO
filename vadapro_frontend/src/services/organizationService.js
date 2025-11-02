import axiosAPI from '../utils/axiosConfig';

// Organization service for API calls
class OrganizationService {
  
  // Create a new organization
  async createOrganization(name, creatorUsername) {
    try {
      const response = await axiosAPI.post('/org/create', {
        name,
        creatorUsername
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get all organizations
  async getAllOrganizations() {
    try {
      const response = await axiosAPI.get('/org/all');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get organizations for a specific user
  async getUserOrganizations(username) {
    try {
      const response = await axiosAPI.get(`/org/user/${username}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get a single organization by ID
  async getOrganizationById(id) {
    try {
      const response = await axiosAPI.get(`/org/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Edit organization
  async editOrganization(id, name, editorUsername) {
    try {
      const response = await axiosAPI.put(`/org/${id}`, {
        name,
        editorUsername
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Delete organization
  async deleteOrganization(id, deleterUsername) {
    try {
      const response = await axiosAPI.delete(`/org/${id}`, {
        data: { deleterUsername }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Remove member from organization
  async removeMember(organizationId, memberUsername, removerUsername) {
    try {
      const response = await axiosAPI.post(`/org/${organizationId}/members/remove`, {
        memberUsername,
        removerUsername
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
export default new OrganizationService();