import axiosAPI from '../utils/axiosConfig';

class WorkYearService {
  async createWorkYear(programId, year, creatorUsername, notes) {
    try {
      const response = await axiosAPI.post('/workyears/create', {
        programId,
        year,
        creatorUsername,
        notes
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getProgramWorkYears(programId) {
    try {
      const response = await axiosAPI.get(`/workyears/program/${programId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getWorkYearById(id) {
    try {
      const response = await axiosAPI.get(`/workyears/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createEntry(workYearId, name) {
    try {
      const response = await axiosAPI.post(`/workyears/${workYearId}/entries`, { name });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async uploadDatasheets(workYearId, files) {
    try {
      const form = new FormData();
      files.forEach(f => form.append('datasheets', f));
      const response = await axiosAPI.post(`/workyears/${workYearId}/datasheets`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async uploadImages(workYearId, files) {
    try {
      const form = new FormData();
      files.forEach(f => form.append('images', f));
      const response = await axiosAPI.post(`/workyears/${workYearId}/images`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      return { success: false, message: error.response.data.message || 'An error occurred', status: error.response.status, data: error.response.data };
    } else if (error.request) {
      return { success: false, message: 'Network error - please check your connection', status: 0 };
    }
    return { success: false, message: error.message || 'An unexpected error occurred', status: 0 };
  }
}

export default new WorkYearService();
