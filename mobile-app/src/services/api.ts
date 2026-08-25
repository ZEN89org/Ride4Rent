import { getToken } from "@/features/auth/storage/authStorage";
import axios from "axios";

export const API_BASE_URL = "http://10.0.2.2:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
});

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
