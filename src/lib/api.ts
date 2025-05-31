import axios from 'axios';

// This will only work on the client
if (typeof window !== 'undefined') {
  axios.interceptors.response.use(
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

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

export default api; 