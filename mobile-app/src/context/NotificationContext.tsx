import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getNotifications, getUnreadNotificationCount, AppNotification } from "@/services/notificationService";
import {
  setupNotificationChannel,
  requestDeviceNotificationPermission,
  triggerDeviceNotification,
  registerNotificationTapListener,
} from "@/services/deviceNotificationService";

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  decrementUnreadCount: (by?: number) => void;
  resetUnreadCount: () => void;
  sendDeviceAlert: (title: string, body: string, data?: Record<string, any>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
  decrementUnreadCount: () => {},
  resetUnreadCount: () => {},
  sendDeviceAlert: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isGuest } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const knownNotificationIds = useRef<Set<string>>(new Set());
  const isInitialFetch = useRef<boolean>(true);

  // Initialize notifications channel, request permission, and register tap handlers on mount
  useEffect(() => {
    const init = async () => {
      await setupNotificationChannel();
      await requestDeviceNotificationPermission();
    };
    init();
    const cleanupTapListener = registerNotificationTapListener();
    return () => {
      cleanupTapListener();
    };
  }, []);

  const userId = user?.id;

  const refreshUnreadCount = useCallback(async () => {
    if (isGuest || !userId) {
      setUnreadCount(0);
      knownNotificationIds.current.clear();
      isInitialFetch.current = true;
      return;
    }
    try {
      const [count, notifications] = await Promise.all([
        getUnreadNotificationCount(),
        getNotifications().catch(() => [] as AppNotification[]),
      ]);
      setUnreadCount(count);

      if (Array.isArray(notifications) && notifications.length > 0) {
        if (isInitialFetch.current) {
          // On app launch, memorize existing IDs without firing alert spam
          notifications.forEach((n) => knownNotificationIds.current.add(String(n.id)));
          isInitialFetch.current = false;
        } else {
          // Check for newly arrived unread notifications
          const unreadNewList = notifications.filter(
            (n) => !n.is_read && !knownNotificationIds.current.has(String(n.id))
          );

          for (const newNotif of unreadNewList) {
            knownNotificationIds.current.add(String(newNotif.id));
            await triggerDeviceNotification(
              newNotif.title || "Ride4Rent Alert",
              newNotif.message || "",
              { action_url: newNotif.action_url, id: newNotif.id }
            );
          }
        }
      }
    } catch {
      // silent catch
    }
  }, [userId, isGuest]);

  useEffect(() => {
    refreshUnreadCount();

    const interval = setInterval(refreshUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  const decrementUnreadCount = useCallback((by: number = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - by));
  }, []);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const sendDeviceAlert = useCallback(
    async (title: string, body: string, data?: Record<string, any>) => {
      await triggerDeviceNotification(title, body, data);
    },
    []
  );

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        decrementUnreadCount,
        resetUnreadCount,
        sendDeviceAlert,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotificationCount = () => useContext(NotificationContext);

