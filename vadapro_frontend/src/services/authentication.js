import axiosAPI from '../utils/axiosConfig.js';

export const authService = {
  // Register function
  async register(credentials) {
    try {
      const response = await axiosAPI.post('/auth/register', credentials);
      return { message: response.data.message };
    } catch (error) {
      const err = new Error(error.response?.data?.message || 'Registration failed');
      err.errorType = error.response?.data?.errorType || 'error';
      throw err;
    }
  },

  // Login function
  async login(credentials) {
    try {
      const response = await axiosAPI.post('/auth/login', credentials);
      
      // Check if the response indicates success
      if (response.status === 200 && response.data) {
        const token = response.data.token || 'demo-token';
        const user = response.data.user || { username: credentials.username };
        
        sessionStorage.setItem('authToken', token);
        sessionStorage.setItem('user', JSON.stringify(user));
        
        return { token, user, message: response.data.message };
      } else {
        const err = new Error(response.data?.message || 'Login failed');
        err.errorType = response.data?.errorType || 'error';
        throw err;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      
      // Handle different error types
      if (error.response) {
        // Server responded with error status
        const errorMessage = error.response.data?.message || 'Login failed';
        const err = new Error(errorMessage);
        err.errorType = error.response.data?.errorType || 'error';
        throw err;
      } else if (error.request) {
        // Request was made but no response received
        const err = new Error('Unable to connect to server. Please check if the server is running.');
        err.errorType = 'connection';
        throw err;
      } else {
        // Something else happened
        const err = new Error(error.message || 'Login failed');
        err.errorType = 'error';
        throw err;
      }
    }
  },

  // Logout function
  logout() {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
  },

  isAuthenticated() {
    return !!sessionStorage.getItem('authToken');
  },

  getCurrentUser() {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
};