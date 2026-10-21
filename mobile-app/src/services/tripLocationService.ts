import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { isRunningInExpoGo, requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";
import { getMyBookings, sendBookingLocation, reportTripLocationOff } from "./bookingService";
import { gpsSpeedKmh } from "@/utils/tripTelemetry";
import { getToken, getUser } from "@/features/auth/storage/authStorage";

const TASK = "ride4rent-active-trip-location";
const TRACKING_KEY = "@ride4rent_tracking_trip";
let latestTransmission = 0;
export type LocationOffReason = "app_setting" | "permission_denied" | "device_location_off";

export async function getLocationSharingOffReason(): Promise<LocationOffReason | null> {
  if (await AsyncStorage.getItem("@settings_location") === "false") return "app_setting";
  if (!await Location.hasServicesEnabledAsync()) return "device_location_off";
  if (!(await Location.getForegroundPermissionsAsync()).granted) return "permission_denied";
  return null;
}

export async function reportActiveTripLocationOff(reason: LocationOffReason) {
  const owner = await getUser();
  if (owner?.role !== "customer") return;
  const bookings = await getMyBookings();
  await Promise.all(bookings.filter((booking) => ["trip_in_progress", "ongoing", "return_pending"].includes(booking.status))
    .map((booking) => reportTripLocationOff(booking.id, reason)));
}

export async function getTripGpsFix(): Promise<Location.LocationObject> {
  const cached = await Location.getLastKnownPositionAsync({ maxAge: 30000, requiredAccuracy: 100 }).catch(() => null);
  if (cached) return cached;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Finding your GPS location. Move outdoors; tracking retries automatically.")), 15000);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Refresh only the signed-in renter's own trip, never the viewing operator's GPS. */
export async function publishCurrentTripLocation(bookingId: number) {
  await ensureOwnTripSharing(bookingId);
  await transmitTripLocation(bookingId);
}

async function ensureOwnTripSharing(bookingId: number) {
  const owner = await getUser();
  const bookings = await getMyBookings();
  const booking = bookings.find((item) => Number(item.id) === bookingId && Number(item.renter_id) === Number(owner?.id));
  if (!booking || !["trip_in_progress", "ongoing", "return_pending"].includes(booking.status)) throw new Error("Location sharing is available only for your active trip.");
  const reason = await getLocationSharingOffReason();
  if (reason) {
    await reportTripLocationOff(bookingId, reason).catch(() => {});
    throw new Error(reason === "app_setting" ? "Turn on Location Services in Ride4Rent Settings." : reason === "device_location_off" ? "Turn on your phone’s location service." : "Allow location access in your phone’s app settings.");
  }
  await ensureTripLocationPermission();
}

export async function watchCurrentTripLocation(bookingId: number, onSent: () => void, onError: (message: string) => void): Promise<Location.LocationSubscription> {
  await ensureOwnTripSharing(bookingId);
  let removed = false;
  let sending = false;
  const subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 10000 }, async (position) => {
    if (removed || sending) return;
    sending = true;
    try {
      const reason = await getLocationSharingOffReason();
      if (reason) {
        await reportTripLocationOff(bookingId, reason).catch(() => {});
        onError("Location sharing is off. Enable Ride4Rent location access and phone GPS.");
        return;
      }
      if (removed) return;
      await transmitTripLocation(bookingId, position);
      if (!removed) onSent();
    } catch {
      if (!removed) onError("Could not share GPS. Check your connection; tracking retries automatically.");
    } finally { sending = false; }
  }, () => { if (!removed) onError("Finding your GPS location. Move outdoors; tracking retries automatically."); });
  return { remove: () => { removed = true; subscription.remove(); } };
}

// Older installed builds may not contain TaskManager yet. Check native support
// before loading its JS wrapper, which otherwise throws while loading the app.
const TaskManager: typeof import("expo-task-manager") | null =
  Platform.OS !== "web" && requireOptionalNativeModule("ExpoTaskManager")
    ? require("expo-task-manager")
    : null;

export const transmitTripLocation = async (bookingId: number, location?: Location.LocationObject) => {
  const position = location ?? await getTripGpsFix();
  const offReason = await getLocationSharingOffReason();
  if (offReason) {
    await reportTripLocationOff(bookingId, offReason).catch(() => {});
    throw new Error("Location sharing is off. Enable Ride4Rent location access and phone GPS.");
  }
  const transmission = ++latestTransmission;
  const coordinates = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    speed: gpsSpeedKmh(position.coords.speed),
    accuracy: position.coords.accuracy ?? undefined,
  };
  // Publish coordinates first. A slow address lookup must not hide the GPS fix.
  await sendBookingLocation(bookingId, coordinates);
  void updateAddress().catch(() => {});
  async function updateAddress() {
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
    if (transmission !== latestTransmission || !Object.keys(address).length || !await getToken()) return;
    if (await getLocationSharingOffReason()) return;
    try { await sendBookingLocation(bookingId, { ...coordinates, ...address }); } catch { /* Next GPS fix will retry. */ }
  }
};

export const ensureTripLocationPermission = async () => {
  const existing = await Location.getForegroundPermissionsAsync();
  const permission = existing.granted ? existing : await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error("Location permission is required to share your active trip location.");
};

export const stopTripTracking = async () => {
  latestTransmission++;
  await AsyncStorage.removeItem(TRACKING_KEY);
  try {
    if (TaskManager && !isRunningInExpoGo() && await Location.hasStartedLocationUpdatesAsync(TASK)) {
      await Location.stopLocationUpdatesAsync(TASK);
    }
  } catch (error) {
    // Cleanup must never interrupt logout or show native exception text to users.
    console.warn("Unable to stop the background location task:", error);
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
  await ensureTripLocationPermission();
  try {
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
  } catch {
    // Background support is optional; foreground sharing must continue.
    return false;
  }
};
