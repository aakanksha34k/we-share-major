import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    // An expired/invalid token on a normal API call -> log out and go to login.
    if (error.response?.status === 401 && !url.includes('/auth/')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!PUBLIC_PATHS.includes(window.location.pathname)) window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
