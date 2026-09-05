import api from "@/services/api";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "booking" | "chat";
  action_url?: string;
  is_read: boolean;
  time: string;
  created_at: string;
}

export const getNotifications = async (): Promise<AppNotification[]> => {
  const response = await api.get("/notifications");
  return response.data.data;
};

export const markNotificationAsRead = async (id: string | number): Promise<void> => {
  await api.patch(`/notifications/${id}/read`);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await api.post("/notifications/read-all");
};
