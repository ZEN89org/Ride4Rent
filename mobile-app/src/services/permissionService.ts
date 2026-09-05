import * as Location from "expo-location";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

// In Expo SDK 53+, remote notifications in Android are not supported in Expo Go.
// We dynamically require expo-notifications only if not running in Expo Go or if safely available.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require("expo-notifications");
  } catch (e) {
    console.log("expo-notifications module not loaded:", e);
  }
}

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (!Notifications) {
      // Running in Expo Go on SDK 53+ or module unavailable
      return true;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Ride4Rent Notifications",
        importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
      });
    }

    const current = await Notifications.getPermissionsAsync();

    if (current.granted) {
      return true;
    }

    if (current.canAskAgain === false) {
      return false;
    }

    const result = await Notifications.requestPermissionsAsync();

    return result.granted;
  } catch (error) {
    console.log("Notification permission handled gracefully:", error);
    return true;
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
