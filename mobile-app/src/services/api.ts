import { getToken } from "@/features/auth/storage/authStorage";
import axios from "axios";
import Constants from "expo-constants";

// In physical devices (Expo Go / standalone), 10.0.2.2 only works for Android Emulators.
// We dynamically detect the Metro host IP (your PC's LAN IP) or fall back to your Wi-Fi IP (192.168.1.15).
const getApiBaseUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoClient?.hostUri;
  if (debuggerHost) {
    const ip = debuggerHost.split(":")[0];
    return `http://${ip}:8000/api/v1`;
  }
  return "http://192.168.1.15:8000/api/v1";
};

export const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
  timeout: 10000,
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
