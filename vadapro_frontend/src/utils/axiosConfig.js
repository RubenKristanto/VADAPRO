import axios from 'axios';

// Determine API base URL: prefer explicit VITE API env, otherwise default to production
const API_BASE = import.meta.env.VITE_API_URL || 'https://vadapro-backend.vercel.app';

// Create axios instance with base configuration
const axiosAPI = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { API_BASE };
export default axiosAPI;