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

export const getUnreadNotificationCount = async (): Promise<number> => {
  const response = await api.get("/notifications/unread-count");
  return response.data?.unread_count ?? 0;
};

export const markNotificationAsRead = async (id: string | number): Promise<void> => {
  await api.patch(`/notifications/${id}/read`);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await api.post("/notifications/read-all");
};

export const deleteNotification = async (id: string | number): Promise<void> => {
  await api.delete(`/notifications/${id}`);
};

export const clearAllNotifications = async (): Promise<void> => {
  await api.delete("/notifications/clear-all");
};

export const createNotification = async (payload: {
  title: string;
  message?: string;
  type?: "info" | "success" | "warning" | "error" | "booking" | "chat";
  action_url?: string;
}): Promise<AppNotification | null> => {
  try {
    const response = await api.post("/notifications", payload);
    return response.data?.data ?? null;
  } catch (e) {
    return null;
  }
};
