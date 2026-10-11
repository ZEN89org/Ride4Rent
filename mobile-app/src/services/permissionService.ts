import * as Location from "expo-location";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { isRunningInExpoGo } from "expo";

const isExpoGo = (() => {
  try {
    return (
      isRunningInExpoGo?.() ||
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
      (Constants as any)?.appOwnership === "expo"
    );
  } catch {
    return false;
  }
})();

let Notifications: typeof import("expo-notifications") | null = null;
if (!isExpoGo || Platform.OS !== "android") {
  try {
    Notifications = require("expo-notifications");
  } catch (e) {
    Notifications = null;
  }
}

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!Notifications || typeof Notifications.getPermissionsAsync !== "function") {
    return true;
  }

  try {
    if (Platform.OS === "android") {
      try {
        if (typeof Notifications.setNotificationChannelAsync === "function") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Ride4Rent Notifications",
            importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
          });

          await Notifications.setNotificationChannelAsync("ride4rent_alerts", {
            name: "Ride4Rent Urgent Alerts",
            importance: Notifications.AndroidImportance?.MAX ?? 5,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FEC103",
            enableLights: true,
            enableVibrate: true,
            showBadge: true,
          });
        }
      } catch (channelError) {
        console.log("Channel setup skipped:", channelError);
      }
    }

    const current = await Notifications.getPermissionsAsync();
    if (current?.granted || current?.status === "granted") {
      return true;
    }

    const result = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return result?.granted === true || result?.status === "granted";
  } catch (error) {
    console.log("Notification permission request error:", error);
    return false;
  }
};

export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const current = await Location.getForegroundPermissionsAsync();

    if (current.granted) {
      return true;
    }

    if (current.canAskAgain === false) {
      return false;
    }

    const result = await Location.requestForegroundPermissionsAsync();

    return result.granted;
  } catch (error) {
    console.log("Location permission error:", error);
    return false;
  }
};
