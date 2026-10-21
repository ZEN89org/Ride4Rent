import { getToken } from "@/features/auth/storage/authStorage";
import axios, { AxiosError } from "axios";
import Constants from "expo-constants";

type SessionExpiredHandler = (requestToken: string) => Promise<void>;

let sessionExpiredHandler: SessionExpiredHandler | null = null;

export const registerSessionExpiredHandler = (
  handler: SessionExpiredHandler
) => {
  sessionExpiredHandler = handler;

  return () => {
    if (sessionExpiredHandler === handler) {
      sessionExpiredHandler = null;
    }
  };
};

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

  // 3. Cloud production URL for universal connectivity across any network
  return "https://ride4rent-production.up.railway.app/api/v1";
};

export const API_BASE_URL = getApiBaseUrl();
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

export const DEFAULT_VEHICLE_IMAGE =
  "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60";

/**
 * Resolves any backend storage path, relative path, or stale local IP URL
 * into a valid full image URL pointing to the actual uploaded image.
 */
export const resolveImageUrl = (
  rawUrl?: string | null,
  fallback: string | null = null
): string | null => {
  if (!rawUrl || typeof rawUrl !== "string") {
    return fallback;
  }

  let trimmed = rawUrl.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") {
    return fallback;
  }

  // Keep local device URIs and data URIs intact
  if (
    trimmed.startsWith("file://") ||
    trimmed.startsWith("content://") ||
    trimmed.startsWith("ph://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("asset://")
  ) {
    return trimmed;
  }

  // Fix accidental double-prefixed URLs like https://host/storage/https://...
  const doubleUrlMatch = trimmed.match(/\/storage\/(https?:\/\/.+)$/i);
  if (doubleUrlMatch?.[1]) {
    trimmed = doubleUrlMatch[1];
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    // Rewrite any localhost or private LAN IP /storage/... URL to the active API_ORIGIN
    const storageMatch = trimmed.match(
      /^https?:\/\/(?:localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+)(?::\d+)?\/storage\/(.+)$/i
    );
    if (storageMatch?.[1]) {
      return `${API_ORIGIN}/storage/${storageMatch[1].replace(/^\/+/, "")}`;
    }

    // Upgrade http:// to https:// for cloud hosts (Railway / ngrok) to avoid cleartext block
    if (
      trimmed.startsWith("http://") &&
      (trimmed.includes(".railway.app") || trimmed.includes(".ngrok"))
    ) {
      return `https://${trimmed.slice(7)}`;
    }

    return trimmed;
  }

  // Relative storage path (e.g., "vehicles/xyz.jpg" or "/storage/vehicles/xyz.jpg")
  const cleanRelative = trimmed
    .replace(/^\/?storage\/+/i, "")
    .replace(/^\/+/, "");
  return `${API_ORIGIN}/storage/${cleanRelative}`;
};

const IMAGE_STRING_KEYS = new Set([
  "image_url",
  "cover_photo",
  "profile_photo",
  "renter_photo",
  "qr_code",
  "qr_code_url",
  "vehicle_image",
  "drivers_license_front",
  "drivers_license_back",
  "drivers_license_front_url",
  "drivers_license_back_url",
  "secondary_driver_license_front",
  "secondary_driver_license_back",
  "government_id_front",
  "government_id_back",
  "business_permit_front",
  "business_permit_back",
  "dti_sec_registration",
]);

const IMAGE_ARRAY_KEYS = new Set([
  "start_inspection_photos",
  "end_inspection_photos",
]);

export const normalizeApiImages = (data: any): any => {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      data[i] = normalizeApiImages(data[i]);
    }
    return data;
  }

  for (const key of Object.keys(data)) {
    const val = data[key];
    if (IMAGE_STRING_KEYS.has(key) && typeof val === "string" && val.trim() !== "") {
      data[key] = resolveImageUrl(val);
    } else if (IMAGE_ARRAY_KEYS.has(key) && Array.isArray(val)) {
      data[key] = val.map((item) =>
        typeof item === "string" ? resolveImageUrl(item) || item : normalizeApiImages(item)
      );
    } else if (val && typeof val === "object") {
      data[key] = normalizeApiImages(val);
    }
  }

  // Fallback for Vehicle objects where image_url is null/missing but cover_photo or images[0] exists
  if (
    ("plate_number" in data || "price_per_day" in data || "daily_rate" in data) &&
    !data.image_url
  ) {
    if (typeof data.cover_photo === "string" && data.cover_photo) {
      data.image_url = resolveImageUrl(data.cover_photo);
    } else if (Array.isArray(data.images) && data.images.length > 0) {
      const firstImg = data.images[0]?.image_url || data.images[0]?.image_path;
      if (firstImg) {
        data.image_url = resolveImageUrl(firstImg);
      }
    }
  }

  return data;
};

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

api.interceptors.response.use(
  (response) => {
    if (response?.data) {
      normalizeApiImages(response.data);
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config;
    const authorization = config?.headers?.Authorization;
    const requestToken =
      typeof authorization === "string"
        ? authorization.replace(/^Bearer\s+/i, "")
        : null;

    if (
      error.response?.status === 401 &&
      requestToken &&
      sessionExpiredHandler
    ) {
      try {
        await sessionExpiredHandler(requestToken);
      } catch (handlerError) {
        console.error("Failed to handle an expired session:", handlerError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

