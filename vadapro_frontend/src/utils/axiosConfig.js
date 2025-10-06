import axios from 'axios';

// Create axios instance with base configuration
const axiosAPI = axios.create({
  baseURL: import.meta.env.VITE_API_URL_DEV || 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosAPI;