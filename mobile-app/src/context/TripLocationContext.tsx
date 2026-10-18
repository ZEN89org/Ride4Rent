import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAppToast } from "./ToastContext";
import { getMyBookings } from "@/services/bookingService";
import {
  startTripTracking,
  stopTripTracking,
  transmitTripLocation,
} from "@/services/tripLocationService";

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
    let background = false;
    let warned = false;
    const refresh = async () => {
      if (busy || disposed || AppState.currentState !== "active") return;
      busy = true;
      try {
        if (!userId || userRole !== "customer") {
          await stopTripTracking();
          return;
        }
        if ((await AsyncStorage.getItem("@settings_location")) === "false") {
          await stopTripTracking();
          trackedId = null;
          return;
        }
        const bookings = await getMyBookings();
        if (disposed) return;
        const trip = bookings.find(
          (b) =>
            ["trip_in_progress", "ongoing", "return_pending"].includes(
              b.status,
            ) && !b.is_multi_vehicle_rental,
        );
        if (!trip) {
          trackedId = null;
          await stopTripTracking();
          return;
        }
        if (trackedId !== trip.id) {
          background = await startTripTracking(trip.id);
          if (disposed) {
            await stopTripTracking();
            return;
          }
          trackedId = trip.id;
          await transmitTripLocation(trip.id);
          if (!background && !warned) {
            warned = true;
            warningRef.current(
              "Trip location",
              "Keep Ride4Rent open to share your location. Background tracking needs location access and an installed app build.",
            );
          }
        }
        if (!background) await transmitTripLocation(trip.id);
      } catch (error: any) {
        if (!warned && !disposed) {
          warned = true;
          warningRef.current(
            "Trip location",
            error.message || "Could not update trip location.",
          );
        }
      } finally {
        busy = false;
      }
    };
    refresh();
    const interval = setInterval(refresh, 20000);
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
