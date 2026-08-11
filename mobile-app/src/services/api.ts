import axios from 'axios';
import { getToken } from '../features/auth/storage/authStorage';

const api = axios.create({
  baseURL: 'http://10.0.2.2:8000/api/v1',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Automatically attach Bearer Token
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
