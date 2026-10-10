import { Platform } from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";

try {
  if (typeof Notifications.setNotificationHandler === "function") {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
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
    if (Platform.OS === "android" && typeof Notifications.setNotificationChannelAsync === "function") {
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
 * Attach listener for when user taps the phone notification to navigate to target screen
 */
export const registerNotificationTapListener = () => {
  if (!Notifications || typeof Notifications.addNotificationResponseReceivedListener !== "function") {
    return () => {};
  }

  try {
    const subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const actionUrl = response?.notification?.request?.content?.data?.action_url;
      if (actionUrl && typeof actionUrl === "string") {
        try {
          router.push(actionUrl as any);
        } catch {
          // ignore routing errors
        }
      }
    });

    return () => {
      if (subscription && typeof subscription.remove === "function") {
        subscription.remove();
      }
    };
  } catch {
    return () => {};
  }
};
