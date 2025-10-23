import axiosAPI from '../utils/axiosConfig.js';

export const authService = {
  // Register function
  async register(credentials) {
    try {
      console.log('calling axios API');
      const response = await axiosAPI.post('/auth/register', credentials);
      return { message: response.data.message };
    } catch (error) {
      console.log('something wrong with axios');
      const err = new Error(error.response?.data?.message || 'Registration failed');
      err.errorType = error.response?.data?.errorType || 'error';
      throw err;
    }
  },

  // Login function
  async login(credentials) {
    try {
      console.log(credentials);
      const response = await axiosAPI.post('/auth/login', credentials);
      
      // Check if the response indicates success
      if (response.status === 200 && response.data) {
        const token = response.data.token || 'demo-token';
        const user = response.data.user || { username: credentials.username };
        
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        
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
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  },

  // Get current user
  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
};