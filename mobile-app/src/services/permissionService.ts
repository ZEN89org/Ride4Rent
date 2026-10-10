import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === "android") {
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

    const current = await Notifications.getPermissionsAsync();

    if (current.granted) {
      return true;
    }

    const result = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return result.granted || result.status === "granted";
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
