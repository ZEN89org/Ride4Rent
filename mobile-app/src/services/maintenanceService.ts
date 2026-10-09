import api from "@/services/api";

export interface MaintenanceLog {
  id: number;
  service_type: string;
  mileage_at_service: number;
  cost: number;
  service_date: string;
  performed_by?: string;
  notes?: string;
}

export interface MaintenanceRecommendation {
  type: string;
  urgency: "critical" | "high" | "medium" | "low";
  message: string;
}

export interface VehicleHealthInfo {
  id: number;
  name: string;
  plate_number?: string;
  brand?: string;
  model?: string;
  image_url?: string;
  current_odometer: number;
  last_service_odometer: number;
  service_interval_km: number;
  km_since_last_service: number;
  km_remaining_until_service: number;
  health_status: "good" | "due_soon" | "overdue";
  health_label: string;
  health_badge: string;
  recommendations: MaintenanceRecommendation[];
  recent_logs: MaintenanceLog[];
}

export const getOperatorMaintenanceList = async (): Promise<VehicleHealthInfo[]> => {
  const response = await api.get("/operator/maintenance");
  return response.data.data;
};

export const logVehicleMaintenance = async (data: {
  vehicle_id: number;
  service_type: string;
  mileage_at_service: number;
  cost?: number;
  service_date: string;
  performed_by?: string;
  notes?: string;
}): Promise<any> => {
  const response = await api.post("/operator/maintenance", data);
  return response.data.data;
};
