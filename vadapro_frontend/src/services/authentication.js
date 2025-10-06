import axiosAPI from '../utils/axiosConfig.js';

export const authService = {
  // Login function
  async login(credentials) {
    try {
      const response = await axiosAPI.post('/auth/login', credentials);
      // Check if the response indicates success
      if (response.data.message === 'Login successful') {
        const token = 'demo-token';
        const user = { username: credentials.username };
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        return { token, user, message: response.data.message };
      }
      throw new Error(response.data.message || 'Login failed');
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
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