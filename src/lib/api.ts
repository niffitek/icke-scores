import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Set up interceptor only on client side
if (typeof window !== 'undefined') {
  api.interceptors.response.use(
    response => response,
    error => {
      console.log(error);
      if (error.response && error.response.status === 401) {
        window.location.href = '/admin/login';
      }
      return Promise.reject(error);
    }
  );
}

export default api;