import axiosAPI from '../utils/axiosConfig';

class WorkYearService {
  async createWorkYear(programId, year, notes) {
    try {
      const response = await axiosAPI.post('/workyears/create', {
        programId,
        year,
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

  async updateEntry(workYearId, entryId, sourceFile) {
    try {
      const response = await axiosAPI.put(`/workyears/${workYearId}/entries/${entryId}`, { sourceFile });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async uploadDatasheets(workYearId, entryId, files) {
    try {
      const form = new FormData();
      files.forEach(f => form.append('datasheets', f));
      const response = await axiosAPI.post(`/workyears/${workYearId}/entries/${entryId}/datasheets`, form, {
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

  async deleteWorkYear(id, deleterUsername) {
    try {
      const response = await axiosAPI.delete(`/workyears/${id}`, { data: { deleterUsername } });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteEntry(workYearId, entryId) {
    try {
      const response = await axiosAPI.delete(`/workyears/${workYearId}/entries/${entryId}`);
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
