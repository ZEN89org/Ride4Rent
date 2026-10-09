import { getToken } from "@/features/auth/storage/authStorage";
import axios from "axios";
import Constants from "expo-constants";

// Determine the API backend URL
const getApiBaseUrl = () => {
  // 1. If an explicit environment URL is defined (e.g. ngrok / cloud server)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. If running with Metro connected (Expo Go or Dev Client)
  const debuggerHost = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoClient?.hostUri;
  if (debuggerHost) {
    const ip = debuggerHost.split(":")[0];
    if (ip && !ip.startsWith("25.") && !ip.startsWith("10.147.")) {
      return `http://${ip}:8000/api/v1`;
    }
  }

  // 3. Ngrok URL for universal tunnel connectivity across any network
  return "https://lily-unhearing-spectrum.ngrok-free.dev/api/v1";
};

export const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  },
  timeout: 15000,
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
