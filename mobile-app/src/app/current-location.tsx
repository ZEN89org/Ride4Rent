import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Radius, Spacing } from "@/constants/theme";

type LocationData = {
  latitude: number;
  longitude: number;
};

type AddressData = {
  street?: string | null;
  streetNumber?: string | null;
  city?: string | null;
  district?: string | null;
  subregion?: string | null;
  region?: string | null;
  country?: string | null;
  formattedAddress?: string | null;
};

const DEFAULT_MINDORO_COORDS: LocationData = {
  latitude: 13.4115,
  longitude: 121.1803,
};

export default function CurrentLocation() {
  const webViewRef = useRef<WebView>(null);

  const [activeLayer, setActiveLayer] = useState<"streets" | "satellite">("streets");
  const [region, setRegion] = useState<LocationData | null>(null);
  const [mapInitialRegion, setMapInitialRegion] = useState<LocationData | null>(null);
  const [address, setAddress] = useState<AddressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [recenterLoading, setRecenterLoading] = useState(false);

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (result && result.length > 0) {
        setAddress(result[0]);
      } else {
        // Fallback to nominatim if expo reverse geocode returns empty
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { "User-Agent": "Ride4Rent-App" } }
          );
          const data = await resp.json();
          if (data?.address) {
            setAddress({
              street: data.address.road || data.address.pedestrian || null,
              district: data.address.suburb || data.address.neighbourhood || data.address.village || null,
              city: data.address.city || data.address.town || data.address.municipality || "Oriental Mindoro",
              region: data.address.state || "MIMAROPA",
              formattedAddress: data.display_name || null,
            });
          }
        } catch {
          // silent fallback
        }
      }
    } catch (error) {
      console.log("Reverse geocode error:", error);
    }
  };

  const updateSelectedLocation = async (latitude: number, longitude: number) => {
    const newLocation = { latitude, longitude };
    setRegion(newLocation);
    await reverseGeocode(latitude, longitude);
  };

  const handleRequestPermission = async () => {
    try {
      setLoading(true);
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.canAskAgain) {
        const req = await Location.requestForegroundPermissionsAsync();
        if (req.status === "granted") {
          setPermissionDenied(false);
          await getCurrentLocation();
          return;
        }
      }
      setLoading(false);
      // If user denied permanently or cannot ask again, open settings
      Linking.openSettings();
    } catch {
      setLoading(false);
      Linking.openSettings();
    }
  };

  const DEFAULT_SERVICE_HUB = {
    latitude: 13.4115, // Calapan City, Oriental Mindoro
    longitude: 121.1803,
  };

  const getCurrentLocation = async (shouldRecenterMap = false) => {
    try {
      if (shouldRecenterMap) {
        setRecenterLoading(true);
      } else {
        setLoading(true);
      }

      setLocationError(false);

      // 1. Verify Foreground Permission
      const permission = await Location.getForegroundPermissionsAsync();
      let isGranted = permission.status === "granted";

      if (!isGranted) {
        const requestedPermission = await Location.requestForegroundPermissionsAsync();
        isGranted = requestedPermission.status === "granted";
        if (!isGranted) {
          setPermissionDenied(true);
          setLoading(false);
          setRecenterLoading(false);
          return;
        }
      }

      setPermissionDenied(false);

      // 2. Check if hardware Location Services (GPS) is enabled on the device
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          Alert.alert(
            "Device Location is Off",
            "Please turn on Location / GPS in your device quick settings for live pinpointing. Showing default regional hub on map.",
            [{ text: "OK" }]
          );
        }
      } catch {}

      let resolvedCoords: { latitude: number; longitude: number } | null = null;

      // Tier 1: Try Last Known Position first for instant loading
      try {
        const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 600000 });
        if (lastKnown?.coords?.latitude && lastKnown?.coords?.longitude) {
          resolvedCoords = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          };
          if (!shouldRecenterMap && !region) {
            setMapInitialRegion(resolvedCoords);
            setRegion(resolvedCoords);
            reverseGeocode(resolvedCoords.latitude, resolvedCoords.longitude);
            setLoading(false);
          }
        }
      } catch (err) {
        console.log("Last known location fetch failed:", err);
      }

      // Tier 2: Try accurate current position with a 6-second timeout
      try {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
        const currentPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const current = await Promise.race([currentPromise, timeoutPromise]);
        if (current && "coords" in current && current.coords?.latitude && current.coords?.longitude) {
          resolvedCoords = {
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          };
        }
      } catch (err) {
        console.log("Balanced accuracy location failed:", err);
      }

      // Tier 3: If still unresolved, try Lowest accuracy (Cell/WiFi, works indoors!) with 5-second timeout
      if (!resolvedCoords) {
        try {
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
          const lowPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Lowest,
          });
          const low = await Promise.race([lowPromise, timeoutPromise]);
          if (low && "coords" in low && low.coords?.latitude && low.coords?.longitude) {
            resolvedCoords = {
              latitude: low.coords.latitude,
              longitude: low.coords.longitude,
            };
          }
        } catch (err) {
          console.log("Lowest accuracy location failed:", err);
        }
      }

      // Tier 4: Fallback to existing selected region or Oriental Mindoro Default Hub
      if (!resolvedCoords) {
        if (region) {
          resolvedCoords = region;
        } else {
          resolvedCoords = DEFAULT_SERVICE_HUB;
        }
      }

      // Apply the resolved coordinates
      if (!shouldRecenterMap || !mapInitialRegion) {
        setMapInitialRegion(resolvedCoords);
      }
      setRegion(resolvedCoords);
      await reverseGeocode(resolvedCoords.latitude, resolvedCoords.longitude);

      if (shouldRecenterMap && webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: "RECENTER_TO_LOCATION",
            latitude: resolvedCoords.latitude,
            longitude: resolvedCoords.longitude,
          })
        );
      }

      setLoading(false);
      setRecenterLoading(false);
      setLocationError(false);
    } catch (error) {
      console.log("Current location error caught:", error);
      // Fallback to default hub so the user can still view the map and drag the pin
      if (!region) {
        setMapInitialRegion(DEFAULT_SERVICE_HUB);
        setRegion(DEFAULT_SERVICE_HUB);
        reverseGeocode(DEFAULT_SERVICE_HUB.latitude, DEFAULT_SERVICE_HUB.longitude);
      }
      setLocationError(false);
      setLoading(false);
      setRecenterLoading(false);
    }
  };

  const handleMapMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = typeof event.nativeEvent.data === "string"
        ? JSON.parse(event.nativeEvent.data)
        : event.nativeEvent.data;

      if (data.type === "MAP_MOVED") {
        const latitude = Number(data.latitude);
        const longitude = Number(data.longitude);

        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          await updateSelectedLocation(latitude, longitude);
        }
      }
    } catch (error) {
      console.log("Map message error:", error);
    }
  };

  const getAddressText = () => {
    if (!address) {
      return "Locating address...";
    }

    const street = [address.streetNumber, address.street].filter(Boolean).join(" ");
    if (street) {
      return street;
    }

    if (address.district) {
      return address.district;
    }

    if (address.formattedAddress) {
      return address.formattedAddress.split(",")[0];
    }

    return "Selected location";
  };

  const getCityText = () => {
    if (!address) {
      return "";
    }

    return [address.city, address.district, address.subregion, address.region]
      .filter(Boolean)
      .join(", ");
  };

  const handleLayerSwitch = (mode: "streets" | "satellite") => {
    setActiveLayer(mode);
    webViewRef.current?.injectJavaScript(`switchLayer('${mode}'); true;`);
  };

  const createMapHtml = () => {
    if (!mapInitialRegion) {
      return "";
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #E8E6DF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      user-select: none;
      -webkit-user-select: none;
    }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-control-zoom { display: none !important; }

    /* Center Marker Pin with Golden Pulse */
    .location-marker-wrapper {
      position: relative;
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .location-glow {
      position: absolute;
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: rgba(254, 193, 3, 0.16);
      animation: locationPulse 2.2s cubic-bezier(0.2, 0.9, 0.3, 1) infinite;
    }
    .location-glow-inner {
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(254, 193, 3, 0.32);
      animation: locationPulseInner 2.2s cubic-bezier(0.2, 0.9, 0.3, 1) infinite;
    }
    .location-marker {
      position: relative;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #FEC103;
      border: 3px solid #1A1A1A;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
      z-index: 10;
    }
    .location-marker::after {
      content: "";
      position: absolute;
      width: 6px;
      height: 6px;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: #1A1A1A;
    }
    @keyframes locationPulse {
      0% { transform: scale(0.6); opacity: 0.9; }
      75% { transform: scale(1.3); opacity: 0.1; }
      100% { transform: scale(1.35); opacity: 0; }
    }
    @keyframes locationPulseInner {
      0% { transform: scale(0.7); opacity: 0.8; }
      60% { transform: scale(1.15); opacity: 0; }
      100% { transform: scale(1.2); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const initialLatitude = ${mapInitialRegion.latitude};
    const initialLongitude = ${mapInitialRegion.longitude};
    let currentMode = "${activeLayer}";

    const map = L.map("map", {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      scrollWheelZoom: true,
    }).setView([initialLatitude, initialLongitude], 16);

    // 1. Watermark-free, official Esri World Street Map
    const streetsLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      minZoom: 3,
      keepBuffer: 6,
    });

    // 2. High-Resolution Google Hybrid Satellite with Roads & Labels
    const satelliteLayer = L.tileLayer("https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      maxZoom: 20,
      minZoom: 3,
      keepBuffer: 6,
    });

    if (currentMode === "satellite") {
      satelliteLayer.addTo(map);
    } else {
      streetsLayer.addTo(map);
    }

    function switchLayer(mode) {
      currentMode = mode;
      if (mode === "streets") {
        map.removeLayer(satelliteLayer);
        if (!map.hasLayer(streetsLayer)) streetsLayer.addTo(map);
      } else if (mode === "satellite") {
        map.removeLayer(streetsLayer);
        satelliteLayer.addTo(map);
      }
      setTimeout(function() { if (map) map.invalidateSize(); }, 100);
    }

    const markerIcon = L.divIcon({
      className: "",
      html: '<div class="location-marker-wrapper"><div class="location-glow"></div><div class="location-glow-inner"></div><div class="location-marker"></div></div>',
      iconSize: [64, 64],
      iconAnchor: [32, 32],
    });

    const marker = L.marker([initialLatitude, initialLongitude], {
      icon: markerIcon,
      interactive: false,
      keyboard: false,
    }).addTo(map);

    let moveTimer = null;
    let isRecentering = false;

    map.on("move", function() {
      const center = map.getCenter();
      marker.setLatLng([center.lat, center.lng]);
    });

    map.on("moveend", function() {
      const center = map.getCenter();
      marker.setLatLng([center.lat, center.lng]);

      if (isRecentering) {
        isRecentering = false;
        return;
      }

      clearTimeout(moveTimer);
      moveTimer = setTimeout(function() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "MAP_MOVED",
            latitude: center.lat,
            longitude: center.lng,
          }));
        }
      }, 100);
    });

    map.on("click", function(event) {
      map.flyTo([event.latlng.lat, event.latlng.lng], map.getZoom(), {
        animate: true,
        duration: 0.45,
      });
    });

    function handleReactNativeMessage(event) {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.type === "RECENTER_TO_LOCATION") {
          const lat = Number(data.latitude);
          const lng = Number(data.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            isRecentering = true;
            marker.setLatLng([lat, lng]);
            map.flyTo([lat, lng], 17, {
              animate: true,
              duration: 0.8,
            });
          }
        } else if (data.type === "SWITCH_LAYER") {
          switchLayer(data.mode);
        }
      } catch (e) {
        console.error("Message error:", e);
      }
    }

    document.addEventListener("message", handleReactNativeMessage);
    window.addEventListener("message", handleReactNativeMessage);

    setTimeout(function() {
      if (map) map.invalidateSize();
    }, 200);
  </script>
</body>
</html>
    `;
  };

  useEffect(() => {
    getCurrentLocation();

    // Auto-detect when user returns from phone Settings after enabling location
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        Location.getForegroundPermissionsAsync().then((perm) => {
          if (perm.status === "granted") {
            setPermissionDenied(false);
            getCurrentLocation();
          }
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleRecenter = async () => {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert(
        "Location Access Required",
        "Please enable location permission so Ride4Rent can center on your current position.",
        [
          { text: "Open Settings", onPress: () => Linking.openSettings() },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }
    getCurrentLocation(true);
  };

  const handleRetry = () => {
    getCurrentLocation();
  };

  const handleConfirmLocation = () => {
    if (permissionDenied || !region) {
      Alert.alert(
        "Location Required",
        "Please enable location permissions and select your location before proceeding.",
        [
          { text: "Enable Location", onPress: handleRequestPermission },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }
    router.replace("/(tabs)/home");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Current Location</Text>

        <Text style={styles.description}>
          Allow Ride4Rent to use your current location to find vehicles near you.
        </Text>

        {/* Street and Satellite view toggle under title and submessage */}
        <View style={styles.layerSelector}>
          <TouchableOpacity
            style={[styles.layerButton, activeLayer === "streets" && styles.layerButtonActive]}
            onPress={() => handleLayerSwitch("streets")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="map"
              size={13}
              color={activeLayer === "streets" ? Colors.white : Colors.secondary}
            />
            <Text
              style={[
                styles.layerButtonText,
                activeLayer === "streets" && styles.layerButtonTextActive,
              ]}
            >
              Streets
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.layerButton, activeLayer === "satellite" && styles.layerButtonActive]}
            onPress={() => handleLayerSwitch("satellite")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="earth"
              size={13}
              color={activeLayer === "satellite" ? Colors.white : Colors.secondary}
            />
            <Text
              style={[
                styles.layerButtonText,
                activeLayer === "satellite" && styles.layerButtonTextActive,
              ]}
            >
              Satellite
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Finding your location...</Text>
          </View>
        ) : permissionDenied ? (
          <View style={styles.permissionContainer}>
            <View style={styles.permissionIconBadge}>
              <Ionicons name="location-outline" size={42} color={Colors.dark} />
            </View>

            <Text style={styles.permissionTitle}>Location Access Required</Text>

            <Text style={styles.permissionText}>
              Ride4Rent needs your location permission to locate where you are on the map, set your pickup point, and show nearby rental vehicles.
            </Text>

            <TouchableOpacity
              style={styles.enableLocationBtn}
              activeOpacity={0.85}
              onPress={handleRequestPermission}
            >
              <Ionicons name="navigate" size={17} color={Colors.dark} />
              <Text style={styles.enableLocationBtnText}>Enable Location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.openSettingsBtn}
              activeOpacity={0.7}
              onPress={() => Linking.openSettings()}
            >
              <Text style={styles.openSettingsBtnText}>Open Device Settings</Text>
            </TouchableOpacity>
          </View>
        ) : locationError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Unable to get your location</Text>

            <Text style={styles.errorText}>
              Please allow location access so Ride4Rent can find your current location.
            </Text>

            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : region ? (
          <WebView
            ref={webViewRef}
            source={{
              html: createMapHtml(),
            }}
            style={styles.map}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
            onMessage={handleMapMessage}
            geolocationEnabled
            scrollEnabled={false}
          />
        ) : null}

        {!loading && !locationError && region && (
          <>
            <View pointerEvents="none" style={styles.mapInstruction}>
              <Text style={styles.mapInstructionText}>
                Move the map or tap to choose a location
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.myLocationButton}
              onPress={handleRecenter}
              disabled={recenterLoading}
            >
              {recenterLoading ? (
                <ActivityIndicator size="small" color={Colors.dark} />
              ) : (
                <View style={styles.myLocationIcon}>
                  <View style={styles.myLocationDot} />
                </View>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />

        <Text style={styles.locationTitle}>Your selected location</Text>

        <Text style={styles.addressText}>{getAddressText()}</Text>

        {getCityText() !== "" && (
          <Text style={styles.locationText}>{getCityText()}</Text>
        )}

        <TouchableOpacity
          style={[styles.confirmButton, !region && styles.disabledButton]}
          disabled={!region}
          onPress={handleConfirmLocation}
        >
          <Text style={styles.confirmText}>Confirm Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.dark,
  },

  description: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondary,
    lineHeight: 22,
  },

  layerSelector: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: Radius.full,
    padding: 3,
    marginTop: Spacing.sm,
    alignSelf: "flex-start",
    gap: 4,
  },

  layerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: Radius.full,
  },

  layerButtonActive: {
    backgroundColor: Colors.dark,
  },

  layerButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11.5,
    color: Colors.secondary,
  },

  layerButtonTextActive: {
    color: Colors.white,
  },

  mapContainer: {
    flex: 1,
    overflow: "hidden",
  },

  map: {
    width: "100%",
    height: "100%",
  },

  mapInstruction: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: "center",
  },

  mapInstructionText: {
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.dark,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  myLocationButton: {
    position: "absolute",
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },

  myLocationIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.dark,
    alignItems: "center",
    justifyContent: "center",
  },

  myLocationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },

  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    backgroundColor: "#F8FAFC",
  },

  permissionIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },

  permissionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
    textAlign: "center",
  },

  permissionText: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },

  enableLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: 25,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  enableLocationBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
  },

  openSettingsBtn: {
    marginTop: Spacing.md,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },

  openSettingsBtnText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.secondary,
    textDecorationLine: "underline",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondary,
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },

  errorTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.dark,
    textAlign: "center",
  },

  errorText: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 21,
  },

  retryButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 25,
  },

  retryText: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },

  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 10,
    backgroundColor: "#D9D9D9",
    marginBottom: Spacing.md,
  },

  bottomSheet: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },

  locationTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.dark,
  },

  addressText: {
    marginTop: 4,
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.dark,
  },

  locationText: {
    marginTop: 3,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
  },

  confirmButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: 25,
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.5,
  },

  confirmText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.white,
  },
});
