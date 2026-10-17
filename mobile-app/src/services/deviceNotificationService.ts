import { Platform } from "react-native";
import { router } from "expo-router";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { isRunningInExpoGo } from "expo";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEY_NOTIFS = "@settings_notifications";
export const STORAGE_KEY_LOCATION = "@settings_location";
export const STORAGE_KEY_BOOKING_REMINDERS = "@ride4rent_booking_reminders";

// Track recently displayed/scheduled notification titles to prevent duplicate alerts
// when both OS local schedule and backend polling detect the same milestone.
const recentAlertTimestamps = new Map<string, number>();
const DEDUPE_WINDOW_MS = 90 * 1000; // 90 seconds

let Notifications: any = null;

// Load local notification modules directly from expo-notifications/build/*
// to avoid importing DevicePushTokenAutoRegistration.fx.js (which throws in Expo Go on Android
// for remote FCM tokens, even though local notifications and channels work natively).
try {
  const { scheduleNotificationAsync } = require("expo-notifications/build/scheduleNotificationAsync");
  const {
    cancelScheduledNotificationAsync,
  } = require("expo-notifications/build/cancelScheduledNotificationAsync");
  const {
    cancelAllScheduledNotificationsAsync,
  } = require("expo-notifications/build/cancelAllScheduledNotificationsAsync");
  const { setNotificationHandler } = require("expo-notifications/build/NotificationsHandler");
  const {
    addNotificationReceivedListener,
    addNotificationResponseReceivedListener,
  } = require("expo-notifications/build/NotificationsEmitter");
  const {
    getPermissionsAsync,
    requestPermissionsAsync,
  } = require("expo-notifications/build/NotificationPermissions");
  const {
    setNotificationChannelAsync,
  } = require("expo-notifications/build/setNotificationChannelAsync");
  const {
    AndroidImportance,
    AndroidNotificationVisibility,
  } = require("expo-notifications/build/NotificationChannelManager.types");
  const {
    SchedulableTriggerInputTypes,
  } = require("expo-notifications/build/Notifications.types");

  Notifications = {
    scheduleNotificationAsync,
    cancelScheduledNotificationAsync,
    cancelAllScheduledNotificationsAsync,
    setNotificationHandler,
    addNotificationReceivedListener,
    addNotificationResponseReceivedListener,
    getPermissionsAsync,
    requestPermissionsAsync,
    setNotificationChannelAsync,
    AndroidImportance,
    AndroidNotificationVisibility,
    SchedulableTriggerInputTypes,
  };
} catch {
  try {
    Notifications = require("expo-notifications");
  } catch {
    Notifications = null;
  }
}

try {
  if (Notifications && typeof Notifications.setNotificationHandler === "function") {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (e) {
  // silent
}

/**
 * Initialize high priority channel for Android Lock Screen & Status Bar heads-up banners
 */
export const setupNotificationChannel = async (): Promise<void> => {
  try {
    if (
      Platform.OS === "android" &&
      Notifications &&
      typeof Notifications.setNotificationChannelAsync === "function"
    ) {
      await Notifications.setNotificationChannelAsync("ride4rent_alerts", {
        name: "Ride4Rent Urgent Alerts",
        importance: Notifications.AndroidImportance?.MAX ?? 5,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#EAB308",
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC ?? 1,
      });

      await Notifications.setNotificationChannelAsync("default", {
        name: "Default Notifications",
        importance: Notifications.AndroidImportance?.MAX ?? 5,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#EAB308",
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC ?? 1,
      });
    }
  } catch (error) {
    // silently catch environment channel limitations
  }
};

/**
 * Request OS device notification permission explicitly (Android 13+ POST_NOTIFICATIONS & iOS)
 */
export const requestDeviceNotificationPermission = async (): Promise<boolean> => {
  if (!Notifications || typeof Notifications.getPermissionsAsync !== "function") {
    return true;
  }

  try {
    const existingStatus = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus?.status;

    if (finalStatus !== "granted" && typeof Notifications.requestPermissionsAsync === "function") {
      const requested = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = requested?.status;
    }

    return finalStatus === "granted";
  } catch (error) {
    return false;
  }
};

/**
 * Trigger a native system notification that appears in phone status bar, lock screen, and home screen
 */
export const triggerDeviceNotification = async (
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  if (!Notifications || typeof Notifications.scheduleNotificationAsync !== "function") {
    return;
  }

  try {
    const savedNotifs = await AsyncStorage.getItem(STORAGE_KEY_NOTIFS);
    if (savedNotifs !== null && JSON.parse(savedNotifs) === false) {
      return;
    }

    const titleKey = title.trim().toLowerCase();
    const signature = `${titleKey}|${body.trim().toLowerCase()}`;
    const nowMs = Date.now();
    const lastFired = recentAlertTimestamps.get(signature) ?? recentAlertTimestamps.get(titleKey);
    if (lastFired && nowMs - lastFired < DEDUPE_WINDOW_MS) {
      return;
    }
    recentAlertTimestamps.set(titleKey, nowMs);
    recentAlertTimestamps.set(signature, nowMs);

    await requestDeviceNotificationPermission();

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
        color: "#EAB308",
        badge: 1,
        ...(Platform.OS === "android" ? { channelId: "ride4rent_alerts" } : {}),
      },
      trigger: null, // triggers immediately
    });
  } catch (error) {
    // silently catch unsupported environments
  }
};

interface StoredReminderMap {
  [bookingKey: string]: {
    status: string;
    notificationIds: string[];
  };
}

const getStoredReminderMap = async (): Promise<StoredReminderMap> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_BOOKING_REMINDERS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveStoredReminderMap = async (map: StoredReminderMap): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_BOOKING_REMINDERS, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
};

const formatShortTripRange = (startStr?: string, endStr?: string): string => {
  if (!startStr) return "your selected dates";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmt = (s: string) => {
    const parts = String(s).split("T")[0].split("-");
    if (parts.length >= 3) {
      const m = months[parseInt(parts[1], 10) - 1] || parts[1];
      return `${m} ${parseInt(parts[2], 10)}`;
    }
    return s;
  };
  const s = fmt(startStr);
  const e = endStr ? fmt(endStr) : s;
  return s === e ? s : `${s} – ${e}`;
};

/**
 * Cancel all scheduled OS reminders for a specific booking (e.g., when paid, cancelled, or deleted)
 */
export const cancelBookingReminders = async (bookingId: number | string): Promise<void> => {
  const key = String(bookingId);
  try {
    const map = await getStoredReminderMap();
    const entry = map[key];
    if (entry && Array.isArray(entry.notificationIds) && Notifications?.cancelScheduledNotificationAsync) {
      for (const notifId of entry.notificationIds) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notifId);
        } catch {
          // ignore if already fired
        }
      }
    }
    if (map[key]) {
      delete map[key];
      await saveStoredReminderMap(map);
    }
  } catch {
    // ignore
  }
};

/**
 * Cancel all scheduled booking reminders across the device (e.g. when user mutes Push Notifications)
 */
export const cancelAllBookingReminders = async (): Promise<void> => {
  try {
    const map = await getStoredReminderMap();
    if (Notifications?.cancelScheduledNotificationAsync) {
      for (const key of Object.keys(map)) {
        const ids = map[key]?.notificationIds || [];
        for (const id of ids) {
          try {
            await Notifications.cancelScheduledNotificationAsync(id);
          } catch {
            // ignore
          }
        }
      }
    }
    await AsyncStorage.removeItem(STORAGE_KEY_BOOKING_REMINDERS);
  } catch {
    // ignore
  }
};

/**
 * Schedule progressive OS local notifications for an unpaid pending_payment booking
 * or a 1-day-before-pickup reminder for an approved booking.
 */
export const scheduleBookingReminders = async (
  booking: any,
  isNewlyCreated = false
): Promise<void> => {
  if (!booking || !booking.id) return;
  if (!Notifications || typeof Notifications.scheduleNotificationAsync !== "function") {
    return;
  }

  try {
    const savedNotifs = await AsyncStorage.getItem(STORAGE_KEY_NOTIFS);
    if (savedNotifs !== null && JSON.parse(savedNotifs) === false) {
      return;
    }

    const key = String(booking.id);
    const map = await getStoredReminderMap();
    const wasPreviouslyScheduled = Boolean(
      map[key] && map[key].status === booking.status && map[key].notificationIds.length > 0
    );

    // If reminders are already scheduled for this exact booking state, skip re-scheduling
    if (wasPreviouslyScheduled && !isNewlyCreated) {
      return;
    }

    // Clear any stale reminders for this booking before scheduling fresh ones
    await cancelBookingReminders(booking.id);

    const vehicleName =
      [booking.vehicle?.brand, booking.vehicle?.name].filter(Boolean).join(" ").trim() ||
      booking.vehicle?.name ||
      "your selected vehicle";
    const resFee = Math.round(Number(booking.reservation_fee) || 500).toLocaleString();
    const tripDates = formatShortTripRange(booking.start_date, booking.end_date);
    const createdMs =
      !isNewlyCreated && booking.created_at ? new Date(booking.created_at).getTime() : Date.now();
    const rawElapsed = Math.floor((Date.now() - createdMs) / 1000);
    // Guard against server/client timezone skew (> 24h or negative)
    const elapsedSeconds = isNewlyCreated || rawElapsed < 0 || rawElapsed > 86400 ? 0 : rawElapsed;

    const scheduledIds: string[] = [];
    const timeIntervalType =
      (Notifications as any).SchedulableTriggerInputTypes?.TIME_INTERVAL ?? "timeInterval";

    // Case A: Unpaid Pending Booking -> 1m, 15m, 2h, 18h reminders
    if (booking.status === "pending_payment" && booking.payment_status === "unpaid") {
      const stages = [
        {
          targetSeconds: 60, // 1 minute (First nudge & live demo friendly)
          title: "Don't Miss Your Ride!",
          body: `Your ${vehicleName} is waiting in your bookings! Settle the ₱${resFee} reservation fee to lock in your trip dates.`,
        },
        {
          targetSeconds: 15 * 60, // 15 minutes
          title: "Complete Your Reservation",
          body: `Your ${vehicleName} (${tripDates}) is still waiting in your bookings. Settle the ₱${resFee} reservation fee to lock in your trip.`,
        },
        {
          targetSeconds: 2 * 3600, // 2 hours
          title: `Still Interested in ${vehicleName}?`,
          body: `Don't miss out on ${vehicleName} (${tripDates}). Complete your ₱${resFee} reservation before another renter books it!`,
        },
        {
          targetSeconds: 18 * 3600, // 18 hours (6 hours before 24h expiry)
          title: "Reservation Expiring Soon",
          body: `Don't miss your reservation! Your pending booking for ${vehicleName} expires in 6 hours. Settle the ₱${resFee} fee now to keep your slot.`,
        },
      ];

      await requestDeviceNotificationPermission();

      // If this unpaid booking already passed at least the 1-minute mark and was not scheduled on this phone yet,
      // fire the most recent reached stage within 3 seconds so the user sees the reminder on their device right away.
      const reachedStages = stages.filter((s) => elapsedSeconds >= s.targetSeconds);
      if (reachedStages.length > 0 && !isNewlyCreated) {
        const latestReached = reachedStages[reachedStages.length - 1];
        try {
          const catchUpId = await Notifications.scheduleNotificationAsync({
            content: {
              title: latestReached.title,
              body: latestReached.body,
              data: {
                action_url: "/(tabs)/bookings",
                booking_id: booking.id,
              },
              sound: true,
              color: "#EAB308",
              badge: 1,
              ...(Platform.OS === "android" ? { channelId: "ride4rent_alerts" } : {}),
            },
            trigger: {
              type: timeIntervalType,
              seconds: 3,
              repeats: false,
              ...(Platform.OS === "android" ? { channelId: "ride4rent_alerts" } : {}),
            } as any,
          });
          if (catchUpId) scheduledIds.push(catchUpId);
        } catch {
          // ignore
        }
      }

      for (const stage of stages) {
        const delaySeconds = stage.targetSeconds - elapsedSeconds;
        if (delaySeconds > 5) {
          try {
            const id = await Notifications.scheduleNotificationAsync({
              content: {
                title: stage.title,
                body: stage.body,
                data: {
                  action_url: "/(tabs)/bookings",
                  booking_id: booking.id,
                },
                sound: true,
                color: "#EAB308",
                badge: 1,
                ...(Platform.OS === "android" ? { channelId: "ride4rent_alerts" } : {}),
              },
              trigger: {
                type: timeIntervalType,
                seconds: delaySeconds,
                repeats: false,
                ...(Platform.OS === "android" ? { channelId: "ride4rent_alerts" } : {}),
              } as any,
            });
            if (id) scheduledIds.push(id);
          } catch {
            // ignore individual schedule failure
          }
        }
      }
    }

    // Case B: Approved Booking -> 1 Day Before Pickup Reminder (at 9:00 AM the day before start_date)
    if (
      (booking.status === "approved" || booking.status === "awaiting_pickup") &&
      booking.start_date
    ) {
      const rawStart = String(booking.start_date).split("T")[0];
      const parts = rawStart.split("-");
      if (parts.length >= 3) {
        const pickupMorning = new Date(
          parseInt(parts[0], 10),
          parseInt(parts[1], 10) - 1,
          parseInt(parts[2], 10),
          9,
          0,
          0
        );
        const dayBeforePickup = new Date(pickupMorning.getTime() - 24 * 3600 * 1000);
        const delaySeconds = Math.floor((dayBeforePickup.getTime() - Date.now()) / 1000);

        if (delaySeconds > 60) {
          await requestDeviceNotificationPermission();
          try {
            const id = await Notifications.scheduleNotificationAsync({
              content: {
                title: "Upcoming Trip Reminder",
                body: `Don't miss your trip tomorrow with ${vehicleName}! Check your pickup details and bring your driver's license.`,
                data: {
                  action_url: "/(tabs)/bookings",
                  booking_id: booking.id,
                },
                sound: true,
                color: "#EAB308",
                badge: 1,
                ...(Platform.OS === "android" ? { channelId: "ride4rent_alerts" } : {}),
              },
              trigger: {
                type: timeIntervalType,
                seconds: delaySeconds,
                repeats: false,
                ...(Platform.OS === "android" ? { channelId: "ride4rent_alerts" } : {}),
              } as any,
            });
            if (id) scheduledIds.push(id);
          } catch {
            // ignore
          }
        }
      }
    }

    if (scheduledIds.length > 0) {
      const updatedMap = await getStoredReminderMap();
      updatedMap[key] = {
        status: booking.status,
        notificationIds: scheduledIds,
      };
      await saveStoredReminderMap(updatedMap);
    }
  } catch {
    // silent catch
  }
};

/**
 * Synchronize OS-scheduled reminders with the renter's current bookings list
 */
export const syncBookingsReminders = async (bookings: any[]): Promise<void> => {
  if (!Array.isArray(bookings)) return;
  try {
    const map = await getStoredReminderMap();
    const activeBookingMap = new Map<string, any>();

    for (const b of bookings) {
      if (b && b.id) {
        activeBookingMap.set(String(b.id), b);
      }
    }

    // Cancel reminders for bookings that were deleted, paid, or changed status
    for (const storedBookingId of Object.keys(map)) {
      const current = activeBookingMap.get(storedBookingId);
      const isStillRemindable =
        current &&
        ((current.status === "pending_payment" && current.payment_status === "unpaid") ||
          current.status === "approved" ||
          current.status === "awaiting_pickup");

      if (!isStillRemindable || map[storedBookingId]?.status !== current.status) {
        await cancelBookingReminders(storedBookingId);
      }
    }

    // Schedule reminders for active remindable bookings
    for (const b of bookings) {
      if (
        (b.status === "pending_payment" && b.payment_status === "unpaid") ||
        b.status === "approved" ||
        b.status === "awaiting_pickup"
      ) {
        await scheduleBookingReminders(b);
      }
    }
  } catch {
    // ignore
  }
};

/**
 * Send a test device notification to verify push alert on physical phone
 */
export const testPushNotification = async (): Promise<boolean> => {
  if (!Notifications) {
    return true;
  }

  try {
    const granted = await requestDeviceNotificationPermission();
    await triggerDeviceNotification(
      "Ride4Rent Test Alert",
      "Push notification is active! You will receive live booking and trip updates here.",
      { action_url: "/(tabs)/bookings" }
    );
    return granted;
  } catch (e) {
    return false;
  }
};

/**
 * Attach listener for when user taps the phone notification to navigate to target screen,
 * and record received scheduled notifications to prevent duplicate banners during polling.
 */
export const registerNotificationTapListener = () => {
  if (!Notifications) {
    return () => {};
  }

  try {
    const receivedSub =
      typeof Notifications.addNotificationReceivedListener === "function"
        ? Notifications.addNotificationReceivedListener((notification: any) => {
            const title = notification?.request?.content?.title;
            const body = notification?.request?.content?.body;
            if (title) {
              const titleKey = String(title).trim().toLowerCase();
              const fullKey = `${titleKey}|${String(body || "").trim().toLowerCase()}`;
              const nowMs = Date.now();
              recentAlertTimestamps.set(titleKey, nowMs);
              recentAlertTimestamps.set(fullKey, nowMs);
            }
          })
        : null;

    const tapSub =
      typeof Notifications.addNotificationResponseReceivedListener === "function"
        ? Notifications.addNotificationResponseReceivedListener((response: any) => {
            const actionUrl = response?.notification?.request?.content?.data?.action_url;
            if (actionUrl && typeof actionUrl === "string") {
              try {
                router.navigate(actionUrl as any);
              } catch {
                // ignore routing errors
              }
            }
          })
        : null;

    return () => {
      if (receivedSub && typeof receivedSub.remove === "function") {
        receivedSub.remove();
      }
      if (tapSub && typeof tapSub.remove === "function") {
        tapSub.remove();
      }
    };
  } catch {
    return () => {};
  }
};
