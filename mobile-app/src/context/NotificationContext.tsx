import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  getNotifications,
  getUnreadNotificationCount,
  AppNotification,
} from "@/services/notificationService";
import { getMyBookings } from "@/services/bookingService";
import { registerPushDevice } from "@/services/pushRegistration";
import {
  triggerDeviceNotification,
  registerNotificationTapListener,
  cancelAllBookingReminders,
  syncBookingsReminders,
} from "@/services/deviceNotificationService";

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  decrementUnreadCount: (by?: number) => void;
  resetUnreadCount: () => void;
  sendDeviceAlert: (
    title: string,
    body: string,
    data?: Record<string, any>,
  ) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
  decrementUnreadCount: () => {},
  resetUnreadCount: () => {},
  sendDeviceAlert: async () => {},
});

const fetchNotificationFeed = () =>
  Promise.all([
    getUnreadNotificationCount(),
    getNotifications().catch(() => [] as AppNotification[]),
  ]);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isGuest } = useAuth();
  const userId = user?.id;
  const userRole = user?.role;
  const [unread, setUnread] = useState<{
    userId: number | undefined;
    count: number;
  }>({ userId, count: 0 });
  const unreadCount = unread.userId === userId && !isGuest ? unread.count : 0;
  const feedSession = useRef({
    userId,
    initialized: false,
    knownIds: new Set<string>(),
  });

  useEffect(() => {
    return registerNotificationTapListener();
  }, []);

  const receiveFeed = useCallback(
    async ([count, notifications]: Awaited<
      ReturnType<typeof fetchNotificationFeed>
    >) => {
      const session = feedSession.current;
      if (session.userId !== userId || isGuest) return;
      setUnread({ userId, count });
      if (!session.initialized) {
        notifications.forEach((notification) =>
          session.knownIds.add(String(notification.id)),
        );
        session.initialized = true;
        {
          getMyBookings()
            .then((bookings) => {
              if (feedSession.current === session)
                return syncBookingsReminders(bookings, userRole);
            })
            .catch(() => {});
        }
        return;
      }
      for (const notification of notifications) {
        if (feedSession.current !== session) return;
        const id = String(notification.id);
        if (notification.is_read || session.knownIds.has(id)) continue;
        session.knownIds.add(id);
        await triggerDeviceNotification(
          notification.title || "Ride4Rent Alert",
          notification.message || "",
          {
            action_url: notification.action_url,
            id: notification.id,
          },
        );
      }
    },
    [isGuest, userId, userRole],
  );

  const refreshUnreadCount = useCallback(async () => {
    if (isGuest || !userId) return;
    try {
      await receiveFeed(await fetchNotificationFeed());
    } catch {
      /* Retry at the next poll. */
    }
  }, [isGuest, userId, receiveFeed]);

  useEffect(() => {
    feedSession.current = {
      userId,
      initialized: false,
      knownIds: new Set<string>(),
    };
    if (isGuest || !userId) {
      cancelAllBookingReminders().catch(() => {});
      return;
    }
    let active = true;
    void registerPushDevice();
    fetchNotificationFeed()
      .then((feed) => {
        if (active) return receiveFeed(feed);
      })
      .catch(() => {});
    const interval = setInterval(refreshUnreadCount, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isGuest, userId, receiveFeed, refreshUnreadCount]);

  const decrementUnreadCount = useCallback(
    (by = 1) => {
      setUnread((previous) => ({
        userId,
        count: Math.max(
          0,
          (previous.userId === userId ? previous.count : 0) - by,
        ),
      }));
    },
    [userId],
  );
  const resetUnreadCount = useCallback(
    () => setUnread({ userId, count: 0 }),
    [userId],
  );
  const sendDeviceAlert = useCallback(
    async (title: string, body: string, data?: Record<string, any>) => {
      await triggerDeviceNotification(title, body, data);
    },
    [],
  );
  const value = useMemo(
    () => ({
      unreadCount,
      refreshUnreadCount,
      decrementUnreadCount,
      resetUnreadCount,
      sendDeviceAlert,
    }),
    [
      unreadCount,
      refreshUnreadCount,
      decrementUnreadCount,
      resetUnreadCount,
      sendDeviceAlert,
    ],
  );
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotificationCount = () => useContext(NotificationContext);
