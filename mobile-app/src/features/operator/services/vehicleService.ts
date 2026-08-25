import { Vehicle, VehicleFormData } from "@/features/operator/types/vehicle";
import api from "@/services/api";

export interface VehicleOption { id: number; name: string; }
export interface VehicleOptions {
  vehicle_types: VehicleOption[];
  vehicle_brands: VehicleOption[];
  body_types: VehicleOption[];
  transmission_types: VehicleOption[];
  fuel_types: VehicleOption[];
}

export const getVehicleOptions = async (): Promise<VehicleOptions> => {
  const response = await api.get("/vehicle-options");
  return response.data.data;
};

export const getMyVehicles = async (): Promise<Vehicle[]> => {
  const response = await api.get("/operator/vehicles");
  return response.data.data;
};

export const createVehicle = async (data: VehicleFormData): Promise<Vehicle> => {
  const formData = new FormData();

  formData.append("name", data.name.trim());
  Object.entries(data).forEach(([key, value]) => {
    if (key !== "imageUri" && value.trim()) {
      formData.append(key, value.trim());
    }
  });

  if (data.imageUri) {
    formData.append("image", {
      uri: data.imageUri,
      name: "vehicle.jpg",
      type: "image/jpeg",
    } as any);
  }

  const response = await api.post("/operator/vehicles", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data.data;
};

export const getAvailableVehicles = async (): Promise<Vehicle[]> => {
  const response = await api.get("/vehicles");
  return response.data.data;
};

export const getNearbyVehicles = async (
  latitude: number,
  longitude: number,
  radius = 10,
): Promise<Vehicle[]> => {
  const response = await api.get("/vehicles", {
    params: { latitude, longitude, radius },
  });
  return response.data.data;
};
