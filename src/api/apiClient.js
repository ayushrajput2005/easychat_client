import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT to every request automatically
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Global response error handler
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    // Dispatch custom event for global error toast
    let errorMessage = 'An error occurred';
    if (!error.response) {
      errorMessage = 'Network Error: Server is offline or unreachable';
    } else if (error.response.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    const event = new CustomEvent('api-error', { detail: errorMessage });
    window.dispatchEvent(event);

    return Promise.reject(error);
  },
);

export default apiClient;
