import * as Location from "expo-location";
import { requestDeviceNotificationPermission, setupNotificationChannel } from "./deviceNotificationService";

// Called by onboarding's Allow button, never by provider startup.
export const requestNotificationPermission = async (): Promise<boolean> => {
  await setupNotificationChannel();
  return requestDeviceNotificationPermission(true);
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
