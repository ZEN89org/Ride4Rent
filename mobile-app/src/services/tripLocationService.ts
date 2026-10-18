import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { isRunningInExpoGo, requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";
import { getMyBookings, sendBookingLocation } from "./bookingService";
import { getToken } from "@/features/auth/storage/authStorage";

const TASK = "ride4rent-active-trip-location";
const TRACKING_KEY = "@ride4rent_tracking_trip";

// Older installed builds may not contain TaskManager yet. Check native support
// before loading its JS wrapper, which otherwise throws while loading the app.
const TaskManager: typeof import("expo-task-manager") | null =
  Platform.OS !== "web" && requireOptionalNativeModule("ExpoTaskManager")
    ? require("expo-task-manager")
    : null;

export const transmitTripLocation = async (bookingId: number, location?: Location.LocationObject) => {
  const position = location ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  let address: Record<string, string> = {};
  try {
    const [geo] = await Location.reverseGeocodeAsync(position.coords);
    if (geo) {
      address = {
        street: geo.street || geo.name || "",
        barangay: geo.district || "",
        city: geo.city || geo.subregion || "",
        location_address: [geo.street || geo.name, geo.district, geo.city].filter(Boolean).join(", "),
      };
    }
  } catch { /* Coordinates are useful even if reverse geocoding is unavailable. */ }
  await sendBookingLocation(bookingId, {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    speed: Math.max(0, (position.coords.speed ?? 0) * 3.6),
    ...address,
  });
};

export const stopTripTracking = async () => {
  await AsyncStorage.removeItem(TRACKING_KEY);
  if (TaskManager && !isRunningInExpoGo() && await Location.hasStartedLocationUpdatesAsync(TASK)) {
    await Location.stopLocationUpdatesAsync(TASK);
  }
};

TaskManager?.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const bookingId = Number(await AsyncStorage.getItem(TRACKING_KEY));
  if (!bookingId || !await getToken() || await AsyncStorage.getItem("@settings_location") === "false") { await stopTripTracking(); return; }
  try {
    const bookings = await getMyBookings();
    if (!bookings.some((b) => b.id === bookingId && ["trip_in_progress", "ongoing", "return_pending"].includes(b.status))) {
      await stopTripTracking();
      return;
    }
    await transmitTripLocation(bookingId, data.locations[data.locations.length - 1]);
  } catch { /* Retry when the OS next supplies a location; do not invent a position. */ }
});

export const startTripTracking = async (bookingId: number): Promise<boolean> => {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") throw new Error("Location permission is required to share your active trip location.");
  if (!TaskManager || isRunningInExpoGo() || !await TaskManager.isAvailableAsync()) return false;
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") return false;
  await AsyncStorage.setItem(TRACKING_KEY, String(bookingId));
  if (!await Location.hasStartedLocationUpdatesAsync(TASK)) {
    await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 20000,
      distanceInterval: 10,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Ride4Rent trip tracking",
        notificationBody: "Your location is shared with your operator during this rental.",
        killServiceOnDestroy: true,
      },
    });
  }
  return true;
};
