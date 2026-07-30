import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const requestNotificationPermission = async () => {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Ride4Rent Notifications",
        importance: Notifications.AndroidImportance.DEFAULT,
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
    console.log("Notification permission error:", error);
    return false;
  }
};

export const requestLocationPermission = async () => {
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
