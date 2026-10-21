import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { getSavedLocation } from "@/storage/locationStorage";
import { isInServiceArea, SERVICE_AREA_ERROR } from "@/utils/serviceArea";

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function usePickupRoute(
  enabled: boolean,
  destinationLat: number,
  destinationLng: number,
  explicitOrigin?: { latitude: number; longitude: number } | null,
) {
  const [gpsOrigin, setOrigin] = useState<{
    latitude: number;
    longitude: number;
  } | null>(explicitOrigin ?? null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const origin = explicitOrigin && Number.isFinite(explicitOrigin.latitude) && Number.isFinite(explicitOrigin.longitude) ? explicitOrigin : gpsOrigin;

  // Load saved location from storage if no explicit origin
  useEffect(() => {
    if (!enabled || explicitOrigin) return;
    let active = true;
    getSavedLocation().then((saved) => {
      if (
        active &&
        saved &&
        Number.isFinite(saved.latitude) &&
        Number.isFinite(saved.longitude) &&
        isInServiceArea(saved.latitude, saved.longitude)
      ) {
        setOrigin((prev) => prev ?? { latitude: saved.latitude, longitude: saved.longitude });
      }
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, [enabled, explicitOrigin]);

  // Watch GPS if enabled and no explicit origin
  useEffect(() => {
    if (!enabled || explicitOrigin) return;
    let active = true;
    let subscription: Location.LocationSubscription | undefined;
    let locationTimeout: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      let granted = permission.granted;
      if (!granted) {
        const req = await Location.requestForegroundPermissionsAsync();
        granted = req.granted;
      }
      if (!granted) {
        if (active) {
          // If we have saved location, don't show hard error
          setOrigin((current) => {
            if (!current) setGpsError("Allow location access or set your location in the app.");
            return current;
          });
        }
        return;
      }

      if (!active) return;
      locationTimeout = setTimeout(() => {
        if (active) {
          setOrigin((current) => {
            if (!current) {
              setGpsError("Finding your GPS location... Move outdoors if signal is weak.");
            }
            return current;
          });
        }
      }, 12000);

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 30,
          timeInterval: 20000,
        },
        (position) => {
          if (active) {
            clearTimeout(locationTimeout);
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            if (isInServiceArea(lat, lng)) {
              setOrigin({ latitude: lat, longitude: lng });
              setGpsError(null);
            }
          }
        },
        (reason) => {
          if (active) {
            clearTimeout(locationTimeout);
            setOrigin((cur) => {
              if (!cur) setGpsError(reason || "Could not update your current location.");
              return cur;
            });
          }
        },
      );
      if (!active) subscription.remove();
    })().catch((error) => {
      clearTimeout(locationTimeout);
      if (active) {
        setOrigin((cur) => {
          if (!cur) setGpsError(error.message || "Could not get your current location.");
          return cur;
        });
      }
    });

    return () => {
      active = false;
      clearTimeout(locationTimeout);
      subscription?.remove();
    };
  }, [enabled, explicitOrigin, retry]);

  const key = `${origin?.latitude?.toFixed(4)},${origin?.longitude?.toFixed(4)};${destinationLat?.toFixed(4)},${destinationLng?.toFixed(4)};${retry}`;
  const [result, setResult] = useState<{
    key: string;
    route?: { coordinates: number[][]; distance: number; duration: number };
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (
      !enabled ||
      !origin ||
      !isInServiceArea(origin.latitude, origin.longitude) ||
      !isInServiceArea(destinationLat, destinationLng)
    )
      return;

    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 12000);

    fetch(
      `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destinationLng},${destinationLat}?overview=full&geometries=geojson&alternatives=false`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Routing service is unavailable. Please try again.");
        const data = await response.json();
        const res = data.routes?.[0];
        if (data.code !== "Ok" || !res?.geometry?.coordinates?.length)
          throw new Error("No road route found between these locations.");

        if (active && !controller.signal.aborted) {
          setResult({
            key,
            route: {
              coordinates: res.geometry.coordinates,
              distance: res.distance,
              duration: res.duration,
            },
          });
        }
      })
      .catch((error) => {
        if (active) {
          // Provide clean straight-line road fallback so trace line is always visible
          const straightDistance = haversineDistance(
            origin.latitude,
            origin.longitude,
            destinationLat,
            destinationLng,
          );
          // Estimate driving speed ~35 km/h in Oriental Mindoro
          const estDurationSec = Math.round((straightDistance / 1000 / 35) * 3600);
          setResult({
            key,
            route: {
              coordinates: [
                [origin.longitude, origin.latitude],
                [destinationLng, destinationLat],
              ],
              distance: straightDistance,
              duration: Math.max(estDurationSec, 180),
            },
          });
        }
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [enabled, origin?.latitude, origin?.longitude, destinationLat, destinationLng, key]);

  const outside =
    !isInServiceArea(destinationLat, destinationLng) ||
    (origin && !isInServiceArea(origin.latitude, origin.longitude));
  const currentResult = result?.key === key ? result : null;
  const error = outside
    ? SERVICE_AREA_ERROR
    : (!explicitOrigin ? gpsError : null) || currentResult?.error || null;

  return {
    origin,
    route: error ? null : (currentResult?.route ?? null),
    error,
    retry: () => setRetry((value) => value + 1),
  };
}
