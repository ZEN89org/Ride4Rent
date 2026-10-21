import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAppToast } from "./ToastContext";
import { getMyBookings } from "@/services/bookingService";
import {
  startTripTracking,
  stopTripTracking,
  transmitTripLocation,
  ensureTripLocationPermission,
  getLocationSharingOffReason,
} from "@/services/tripLocationService";
import { reportTripLocationOff } from "@/services/bookingService";

/** Keeps rental tracking alive when the renter leaves the bookings screen. */
export function TripLocationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const userId = user?.id;
  const userRole = user?.role;
  const { showWarning } = useAppToast();
  const warningRef = useRef(showWarning);
  useEffect(() => {
    warningRef.current = showWarning;
  }, [showWarning]);

  useEffect(() => {
    let disposed = false;
    let busy = false;
    let trackedId: number | null = null;
    let warned = false;
    const refresh = async () => {
      if (busy || disposed || AppState.currentState !== "active") return;
      busy = true;
      try {
        if (!userId || userRole !== "customer") {
          await stopTripTracking();
          return;
        }
        const bookings = await getMyBookings();
        if (disposed) return;
        const offReason = await getLocationSharingOffReason();
        if (offReason) {
          await Promise.all(bookings.filter((booking) => ["trip_in_progress", "ongoing", "return_pending"].includes(booking.status)).map((booking) => reportTripLocationOff(booking.id, offReason)));
          await stopTripTracking();
          trackedId = null;
          return;
        }
        const trip = bookings.find(
          (b) =>
            ["trip_in_progress", "ongoing", "return_pending"].includes(
              b.status,
            ) && ![true, 1, "1", "true"].includes(b.is_multi_vehicle_rental as boolean | number | string),
        );
        if (!trip) {
          trackedId = null;
          await stopTripTracking();
          return;
        }
        if (trackedId !== trip.id) {
          await ensureTripLocationPermission();
          if (disposed) return;
          await transmitTripLocation(trip.id);
          if (disposed) return;
          trackedId = trip.id;
          void startTripTracking(trip.id).then(async (background) => {
            if (disposed) { await stopTripTracking(); return; }
            if (!background && !warned) {
              warned = true;
              warningRef.current("Trip location", "Keep Ride4Rent open to share your location. Background tracking needs location access and an installed app build.");
            }
          }).catch(() => { /* Foreground updates continue independently. */ });
        } else {
          // The OS may delay background callbacks even after registration succeeds.
          await transmitTripLocation(trip.id);
        }
      } catch (error: any) {
        console.error("Trip location update failed:", error);
        if (!warned && !disposed && userId && userRole === "customer") {
          warned = true;
          warningRef.current(
            "Trip location",
            "Location sharing is unavailable. Check location permissions and keep Ride4Rent open during your trip.",
          );
        }
      } finally {
        busy = false;
      }
    };
    refresh();
    const interval = setInterval(refresh, 10000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      disposed = true;
      clearInterval(interval);
      listener.remove();
      stopTripTracking().catch(() => {});
    };
  }, [userId, userRole]);

  return children;
}
